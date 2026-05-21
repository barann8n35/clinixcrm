import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PermissionState = "default" | "granted" | "denied";
type ConnectionStatus = "disconnected" | "pending" | "connected";

const DEBUG_TOAST_ID = "push-debug-toast";

function getCurrentPermission(): PermissionState {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "default";
  return Notification.permission as PermissionState;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>(getCurrentPermission);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");

  // Sync permission state
  useEffect(() => {
    const sync = () => setPermission(getCurrentPermission());
    window.addEventListener("focus", sync);
    const interval = setInterval(sync, 3000);
    return () => {
      window.removeEventListener("focus", sync);
      clearInterval(interval);
    };
  }, []);

  // Check existing subscription on mount
  useEffect(() => {
    async function checkConnection() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);
        if (data && data.length > 0) {
          setConnectionStatus("connected");
        }
      } catch {
        // ignore
      }
    }
    checkConnection();
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") {
      toast.error("Bu tarayıcı bildirimleri desteklemiyor.");
      return false;
    }

    setLoading(true);
    setConnectionStatus("pending");

    try {
      // Step 1: Native browser permission
      const nativeResult = Notification.permission === "granted"
        ? Notification.permission
        : await Notification.requestPermission();

      setPermission(nativeResult as PermissionState);

      if (nativeResult !== "granted") {
        toast.error(
          nativeResult === "denied"
            ? "Bildirimler tarayıcı ayarlarından engellendi."
            : "Bildirim izni verilmedi."
        );
        setConnectionStatus("disconnected");
        return false;
      }

      toast.info("Tarayıcı izni alındı. OneSignal başlatılıyor...", { id: DEBUG_TOAST_ID, duration: 10000 });

      // Step 2: Initialize OneSignal
      const {
        initOneSignal,
        OneSignal,
        getOneSignalDebugSnapshot,
        waitForOneSignalSubscriptionId,
      } = await import("@/lib/onesignal");

      await initOneSignal();

      // Step 3: Opt-in via OneSignal
      try {
        await OneSignal.User.PushSubscription.optIn();
      } catch (optInErr: any) {
        console.warn(`[Push] OneSignal optIn warning: ${optInErr?.message || String(optInErr)}`);
      }

      // Step 4: Wait for Subscription ID via change event listener + polling fallback
      toast.info("Subscription ID bekleniyor...", { id: DEBUG_TOAST_ID, duration: 15000 });

      const subId = await waitForOneSignalSubscriptionId(20000, 1500, (snapshot, attempt) => {
        console.info(`[Push] Poll ${attempt} — permission: ${snapshot.permission}, userId: ${snapshot.userId}, subId: ${snapshot.subscriptionId}`);
        toast.info(`Kontrol ${attempt} • Sub ID: ${snapshot.subscriptionId ?? "bekleniyor..."}`, {
          id: DEBUG_TOAST_ID,
          duration: 10000,
        });
      });

      if (!subId) {
        toast.warning("Subscription ID alınamadı. Lütfen sayfayı yenileyip tekrar deneyin.");
        setConnectionStatus("pending");
        return false;
      }

      toast.dismiss(DEBUG_TOAST_ID);
      console.info(`[Push] Subscription ID resolved: ${subId}`);

      // Step 5: Save to Supabase (only with valid, non-null ID)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        toast.error("Kullanıcı oturumu bulunamadı.");
        setConnectionStatus("disconnected");
        return false;
      }

      const { data: existing } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const matched = existing?.find((s) => s.endpoint === subId);
      const recordId = matched?.id ?? crypto.randomUUID();

      const { error: dbError } = await supabase.from("push_subscriptions").upsert(
        {
          id: recordId,
          user_id: user.id,
          endpoint: subId,
          p256dh_key: null,
          auth_key: null,
        } as any,
        { onConflict: "id" }
      );

      if (dbError) {
        console.error("[Push] Supabase upsert error:", dbError);
        toast.error(`Supabase hatası: ${dbError.message}`);
        setConnectionStatus("pending");
        return false;
      }

      setConnectionStatus("connected");
      toast.success("🎉 Bildirimler başarıyla aktif!", { duration: 6000 });
      return true;

    } catch (err: any) {
      console.error("[Push] Unexpected error:", err);
      toast.error(`Beklenmeyen hata: ${err?.message || String(err)}`);
      setConnectionStatus("disconnected");
      return false;
    } finally {
      toast.dismiss(DEBUG_TOAST_ID);
      setLoading(false);
    }
  }, []);

  return { permission, loading, connectionStatus, requestPermission };
}

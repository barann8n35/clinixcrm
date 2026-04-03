import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PermissionState = "default" | "granted" | "denied";
type ConnectionStatus = "disconnected" | "pending" | "connected";

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
      // Step 1: Native browser permission first
      const nativeResult = await Notification.requestPermission();
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

      toast.info("Tarayıcı izni alındı. OneSignal başlatılıyor...");

      // Step 2: Initialize OneSignal
      const { initOneSignal, OneSignal } = await import("@/lib/onesignal");
      await initOneSignal();

      // Step 3: Opt-in via OneSignal
      try {
        await OneSignal.User.PushSubscription.optIn();
      } catch (optInErr: any) {
        console.warn("[Push] optIn failed, continuing:", optInErr?.message);
      }

      // Step 4: Wait for Subscription ID with retries
      let subId: string | null | undefined = null;
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        subId = OneSignal.User.PushSubscription.id;
        if (subId) break;
      }

      if (!subId) {
        toast.warning("OneSignal henüz bir Subscription ID üretmedi. Birkaç saniye bekleyip tekrar deneyin.");
        setConnectionStatus("pending");
        return false;
      }

      toast.success(`OneSignal ID Alındı: ${subId.substring(0, 12)}... — Supabase'e yazılıyor...`);

      // Step 5: Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        toast.error("Kullanıcı oturumu bulunamadı. Lütfen giriş yapın ve tekrar deneyin.");
        setConnectionStatus("pending");
        return false;
      }

      // Step 6: Upsert to Supabase
      const { error: dbError } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: subId,
          p256dh_key: null,
          auth_key: null,
        } as any,
        { onConflict: "user_id,endpoint" }
      );

      if (dbError) {
        console.error("[Push] Supabase error:", dbError);
        toast.error(`Supabase hatası: ${dbError.message} (Code: ${dbError.code})`);
        setConnectionStatus("pending");
        return false;
      }

      // Step 7: Success
      setConnectionStatus("connected");
      toast.success("🎉 BAĞLANTI TAMAMLANDI — Bildirimler başarıyla aktif!", { duration: 6000 });
      return true;

    } catch (err: any) {
      console.error("[Push] Unexpected error:", err);
      toast.error(`Beklenmeyen hata: ${err?.message || String(err)}`);
      setConnectionStatus("disconnected");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { permission, loading, connectionStatus, requestPermission };
}

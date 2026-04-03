import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PermissionState = "default" | "granted" | "denied";
type ConnectionStatus = "disconnected" | "pending" | "connected";
type DebugLevel = "info" | "warning" | "error";

const DEBUG_TOAST_ID = "push-debug-toast";

function logDebug(message: string, level: DebugLevel = "info") {
  const prefixedMessage = `[Push] ${message}`;

  if (level === "error") {
    console.error(prefixedMessage);
    toast.error(message);
    return;
  }

  if (level === "warning") {
    console.warn(prefixedMessage);
    toast.warning(message, { id: DEBUG_TOAST_ID, duration: 10000 });
    return;
  }

  console.info(prefixedMessage);
  toast.info(message, { id: DEBUG_TOAST_ID, duration: 10000 });
}

function logSnapshot(
  snapshot: { permission: NotificationPermission | "unsupported"; userId: string | null; subscriptionId: string | null },
  attempt?: number,
) {
  const prefix = attempt ? `Kontrol ${attempt}/10 • ` : "";
  const permissionMessage = `Permission status: ${snapshot.permission}`;
  const userIdMessage = `OneSignal User ID: ${snapshot.userId ?? "null"}`;
  const subscriptionIdMessage = `Subscription ID: ${snapshot.subscriptionId ?? "null"}`;

  console.info(`[Push] ${permissionMessage}`);
  console.info(`[Push] ${userIdMessage}`);
  console.info(`[Push] ${subscriptionIdMessage}`);
  toast.info(`${prefix}${permissionMessage} • ${userIdMessage} • ${subscriptionIdMessage}`, {
    id: DEBUG_TOAST_ID,
    duration: 10000,
  });
}

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
      logDebug(`Permission status: ${Notification.permission}`);

      // Step 1: Native browser permission first
      const nativeResult = Notification.permission === "granted"
        ? Notification.permission
        : await Notification.requestPermission();

      setPermission(nativeResult as PermissionState);
      logDebug(`Permission status: ${nativeResult}`);

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
      logSnapshot(getOneSignalDebugSnapshot());

      // Step 3: Opt-in via OneSignal
      try {
        await OneSignal.User.PushSubscription.optIn();
      } catch (optInErr: any) {
        logDebug(`OneSignal optIn warning: ${optInErr?.message || String(optInErr)}`, "warning");
      }

      // Step 4: Wait for Subscription ID with polling
      const subId = await waitForOneSignalSubscriptionId(15000, 1000, (snapshot, attempt) => {
        logSnapshot(snapshot, attempt);
      });

      if (!subId) {
        toast.warning("Hizmet başlatılamadı, lütfen sayfayı yenileyin.");
        setConnectionStatus("pending");
        return false;
      }

      toast.dismiss(DEBUG_TOAST_ID);
      console.info(`[Push] Subscription ID resolved: ${subId}`);
      toast.success("OneSignal ID Alındı, Supabase'e yazılıyor...");

      // Step 5: Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        logDebug("Kullanıcı oturumu bulunamadı. Subscription ID Supabase'e yazılamadı.", "error");
        setConnectionStatus("disconnected");
        return false;
      }

      const { data: existingSubscriptions, error: readError } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (readError) {
        logDebug(`Supabase okuma hatası: ${readError.message}`, "error");
        setConnectionStatus("pending");
        return false;
      }

      const matchedSubscription = existingSubscriptions?.find((subscription) => subscription.endpoint === subId);
      const recordId = matchedSubscription?.id ?? existingSubscriptions?.[0]?.id ?? crypto.randomUUID();

      // Step 6: Upsert to Supabase
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
      toast.dismiss(DEBUG_TOAST_ID);
      setLoading(false);
    }
  }, []);

  return { permission, loading, connectionStatus, requestPermission };
}

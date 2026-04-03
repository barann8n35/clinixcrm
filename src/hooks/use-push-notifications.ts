import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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

  useEffect(() => {
    const sync = () => setPermission(getCurrentPermission());
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    const interval = setInterval(sync, 2000);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
      clearInterval(interval);
    };
  }, []);

  // Check existing token on mount
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
      toast({ title: "Hata", description: "Bu tarayıcı bildirimleri desteklemiyor.", variant: "destructive" });
      return false;
    }

    setLoading(true);
    setConnectionStatus("pending");

    try {
      // Step 1: Try OneSignal prompt with a timeout fallback
      let oneSignalWorked = false;
      try {
        const { OneSignal } = await import("@/lib/onesignal");

        // Race: OneSignal prompt vs 8s timeout
        await Promise.race([
          OneSignal.Slidedown.promptPush(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("OneSignal prompt timeout")), 8000)),
        ]);
        oneSignalWorked = true;
      } catch (promptErr: any) {
        console.warn("[Push] OneSignal prompt failed/timed out, falling back to native:", promptErr?.message);
      }

      // Step 2: Fallback — use native Notification.requestPermission if OneSignal didn't work
      if (!oneSignalWorked) {
        const nativeResult = await Notification.requestPermission();
        setPermission(nativeResult as PermissionState);

        if (nativeResult !== "granted") {
          toast({
            title: "İzin Verilmedi",
            description: nativeResult === "denied"
              ? "Bildirimler tarayıcı ayarlarından engellendi."
              : "Bildirim izni verilmedi.",
            variant: "destructive",
          });
          setConnectionStatus("disconnected");
          return false;
        }

        // After native permission, try to login OneSignal in background
        try {
          const { initOneSignal } = await import("@/lib/onesignal");
          await initOneSignal();
        } catch {
          // continue without OneSignal
        }
      }

      // Step 3: Update permission state
      const result = Notification.permission as PermissionState;
      setPermission(result);

      if (result !== "granted") {
        setConnectionStatus("disconnected");
        toast({
          title: "İzin Verilmedi",
          description: "Bildirim izni verilemedi.",
          variant: "destructive",
        });
        return false;
      }

      // Step 4: Try to get OneSignal subscription ID
      let subId: string | null | undefined = null;
      try {
        const { OneSignal } = await import("@/lib/onesignal");
        // Wait briefly for registration
        await new Promise((r) => setTimeout(r, 2000));
        subId = await OneSignal.User.PushSubscription.id;
      } catch (idErr: any) {
        console.warn("[Push] Failed to get OneSignal Subscription ID:", idErr?.message);
      }

      if (!subId) {
        toast({
          title: "⚠️ Player ID Alınamadı",
          description: "OneSignal henüz bir Subscription ID üretmedi. Birkaç saniye bekleyip tekrar deneyin.",
          variant: "destructive",
        });
        setConnectionStatus("pending");
        return false;
      }

      // Step 5: Player ID received
      toast({
        title: "✅ OneSignal ID Alındı",
        description: `Player ID: ${subId.substring(0, 12)}... — Supabase'e yazılıyor...`,
      });

      // Step 6: Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId) {
        toast({
          title: "Oturum Hatası",
          description: "Kullanıcı oturumu bulunamadı. Lütfen giriş yapın ve tekrar deneyin.",
          variant: "destructive",
        });
        setConnectionStatus("pending");
        return false;
      }

      // Step 7: Upsert to Supabase
      const { error: dbError } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: subId,
          p256dh_key: null,
          auth_key: null,
        } as any,
        { onConflict: "user_id,endpoint" }
      );

      if (dbError) {
        console.error("[Push] Supabase insert error:", dbError);
        toast({
          title: "❌ Supabase Hatası",
          description: `Token kaydedilemedi: ${dbError.message} (Code: ${dbError.code})`,
          variant: "destructive",
        });
        setConnectionStatus("pending");
        return false;
      }

      // Step 8: Success
      setConnectionStatus("connected");
      toast({
        title: "🎉 Bildirimler Aktif",
        description: "Player ID başarıyla Supabase'e kaydedildi!",
      });
      return true;

    } catch (err: any) {
      console.error("[Push] Unexpected error:", err);
      toast({
        title: "Beklenmeyen Hata",
        description: `${err?.message || String(err)}`,
        variant: "destructive",
      });
      setConnectionStatus("disconnected");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { permission, loading, connectionStatus, requestPermission };
}

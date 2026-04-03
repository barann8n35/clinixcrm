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
      // Step 1: Dynamically import OneSignal
      const { OneSignal } = await import("@/lib/onesignal");

      // Step 2: Prompt push
      try {
        await OneSignal.Slidedown.promptPush();
      } catch (promptErr: any) {
        console.error("[Push] OneSignal prompt error:", promptErr);
        toast({
          title: "OneSignal Hatası",
          description: `Bildirim penceresi açılamadı: ${promptErr?.message || String(promptErr)}`,
          variant: "destructive",
        });
        setConnectionStatus("disconnected");
        setLoading(false);
        return false;
      }

      // Step 3: Check browser permission
      const result = Notification.permission as PermissionState;
      setPermission(result);

      if (result !== "granted") {
        setConnectionStatus("disconnected");
        toast({
          title: "İzin Verilmedi",
          description: result === "denied"
            ? "Bildirimler tarayıcı ayarlarından engellendi. Site ayarlarından izin verin."
            : "Bildirim izni verilmedi.",
          variant: "destructive",
        });
        setLoading(false);
        return false;
      }

      // Step 4: Wait for OneSignal to register, then get ID
      await new Promise((r) => setTimeout(r, 2000));

      let subId: string | null | undefined = null;
      try {
        subId = await OneSignal.User.PushSubscription.id;
      } catch (idErr: any) {
        console.error("[Push] Failed to get OneSignal Subscription ID:", idErr);
      }

      if (!subId) {
        toast({
          title: "⚠️ Player ID Alınamadı",
          description: "OneSignal henüz bir Subscription ID üretmedi. Lütfen birkaç saniye bekleyip tekrar deneyin.",
          variant: "destructive",
        });
        setConnectionStatus("pending");
        setLoading(false);
        return false;
      }

      // Step 5: Player ID received — green toast
      toast({
        title: "✅ OneSignal ID Alındı",
        description: `Player ID: ${subId.substring(0, 12)}... — Supabase'e yazılıyor...`,
      });

      // Step 6: Get current user (may be null for anon)
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId) {
        toast({
          title: "Oturum Hatası",
          description: "Kullanıcı oturumu bulunamadı. Lütfen giriş yapın ve tekrar deneyin.",
          variant: "destructive",
        });
        setConnectionStatus("pending");
        setLoading(false);
        return false;
      }

      // Step 7: Insert/upsert to Supabase with full error handling
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
        setLoading(false);
        return false;
      }

      // Step 8: Success!
      setConnectionStatus("connected");
      toast({
        title: "🎉 Bildirimler Aktif",
        description: "Player ID başarıyla Supabase'e kaydedildi. Artık bildirim alabilirsiniz!",
      });
      setLoading(false);
      return true;

    } catch (err: any) {
      console.error("[Push] Unexpected error:", err);
      toast({
        title: "Beklenmeyen Hata",
        description: `${err?.message || String(err)}`,
        variant: "destructive",
      });
      setConnectionStatus("disconnected");
      setLoading(false);
      return false;
    }
  }, []);

  return { permission, loading, connectionStatus, requestPermission };
}

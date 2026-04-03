import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type PermissionState = "default" | "granted" | "denied";

function getCurrentPermission(): PermissionState {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "default";
  return Notification.permission as PermissionState;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>(getCurrentPermission);
  const [loading, setLoading] = useState(false);

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

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") {
      toast({ title: "Hata", description: "Bu tarayıcı bildirimleri desteklemiyor.", variant: "destructive" });
      return false;
    }

    setLoading(true);
    try {
      // Dynamically import OneSignal to avoid dual-React bundle issues
      const { OneSignal } = await import("@/lib/onesignal");

      await OneSignal.Slidedown.promptPush();

      const result = Notification.permission as PermissionState;
      setPermission(result);

      if (result === "granted") {
        await new Promise((r) => setTimeout(r, 1500));
        const subId = await OneSignal.User.PushSubscription.id;

        if (subId) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("push_subscriptions").upsert(
              {
                user_id: user.id,
                endpoint: subId,
                p256dh_key: null,
                auth_key: null,
              } as any,
              { onConflict: "user_id,endpoint" }
            );
          }
        }

        toast({ title: "Başarılı", description: "Bildirimler etkinleştirildi! 🔔" });
        return true;
      } else if (result === "denied") {
        toast({ title: "Engellendi", description: "Bildirim izni reddedildi. Tarayıcı ayarlarından etkinleştirebilirsiniz.", variant: "destructive" });
      }
      return false;
    } catch (err) {
      console.error("Push notification error:", err);
      toast({ title: "Hata", description: "Bildirim izni alınamadı.", variant: "destructive" });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { permission, loading, requestPermission };
}

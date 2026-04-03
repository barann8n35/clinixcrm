import { useState, useCallback, useEffect } from "react";
import { OneSignal } from "@/lib/onesignal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type PermissionState = "default" | "granted" | "denied";

function getCurrentPermission(): PermissionState {
  return typeof Notification !== "undefined" ? (Notification.permission as PermissionState) : "default";
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>(getCurrentPermission);

  useEffect(() => {
    const sync = () => setPermission(getCurrentPermission());

    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);

    // Poll every 2s as a fallback (permission changes aren't observable via events)
    const interval = setInterval(sync, 2000);

    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
      clearInterval(interval);
    };
  }, []);
  const [loading, setLoading] = useState(false);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") {
      toast({ title: "Hata", description: "Bu tarayıcı bildirimleri desteklemiyor.", variant: "destructive" });
      return false;
    }

    setLoading(true);
    try {
      // Use OneSignal to prompt for permission
      await OneSignal.Slidedown.promptPush();

      // Check permission after prompt
      const result = Notification.permission as PermissionState;
      setPermission(result);

      if (result === "granted") {
        // Wait a moment for OneSignal to register the subscription
        await new Promise((r) => setTimeout(r, 1500));

        // Get OneSignal Subscription ID (Player ID)
        const subId = await OneSignal.User.PushSubscription.id;

        if (subId) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("push_subscriptions").upsert(
              {
                user_id: user.id,
                endpoint: subId, // Store OneSignal Subscription/Player ID as endpoint
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

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type PermissionState = "default" | "granted" | "denied";

export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>(
    typeof Notification !== "undefined" ? Notification.permission as PermissionState : "default"
  );
  const [loading, setLoading] = useState(false);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") {
      toast({ title: "Hata", description: "Bu tarayıcı bildirimleri desteklemiyor.", variant: "destructive" });
      return false;
    }

    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);

      if (result === "granted") {
        // Register push subscription
        const registration = await navigator.serviceWorker?.ready;
        if (registration) {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: undefined, // VAPID key would go here for production
          }).catch(() => null);

          if (subscription) {
            const json = subscription.toJSON();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from("push_subscriptions" as any).upsert({
                user_id: user.id,
                endpoint: json.endpoint,
                p256dh_key: json.keys?.p256dh || null,
                auth_key: json.keys?.auth || null,
              }, { onConflict: "user_id,endpoint" });
            }
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

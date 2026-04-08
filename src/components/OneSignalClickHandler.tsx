import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { OneSignal } from "@/lib/onesignal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Listens for OneSignal notification clicks (body + action buttons).
 * Must be rendered inside <BrowserRouter>.
 */
export const OneSignalClickHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleClick = async (event: any) => {
      console.info("[OneSignal] Notification clicked:", event);

      const actionId: string | undefined = event?.result?.actionId;
      const notification = event?.notification;
      const data = notification?.additionalData as Record<string, string> | undefined;
      const launchURL: string | undefined = notification?.launchURL ?? notification?.url;

      // Extract patient ID from data payload or launchURL query param
      let patientId: string | null = data?.patient_id ?? null;
      if (!patientId && launchURL) {
        try {
          const url = new URL(launchURL, window.location.origin);
          patientId = url.searchParams.get("id");
        } catch {
          // ignore parse errors
        }
      }

      // --- mark_done action: silently deactivate reminder ---
      if (actionId === "mark_done") {
        if (patientId) {
          try {
            const { error } = await supabase
              .from("patients")
              .update({ reminder_active: false, reminder_sent: true })
              .eq("id", patientId);

            if (error) throw error;
            toast.success("Hatırlatıcı tamamlandı ✓");
          } catch (err) {
            console.error("[OneSignal] mark_done failed:", err);
            toast.error("Hatırlatıcı güncellenemedi");
          }
        } else {
          toast.warning("Hasta bilgisi bulunamadı");
        }
        return; // don't navigate
      }

      // --- view_patient action OR body click: navigate to patient ---
      if (actionId === "view_patient" || !actionId) {
        if (patientId) {
          navigate(`/patients?id=${encodeURIComponent(patientId)}`);
        } else if (launchURL) {
          // Fallback: use launchURL path
          try {
            const url = new URL(launchURL, window.location.origin);
            navigate(url.pathname + url.search);
          } catch {
            navigate("/notifications");
          }
        } else {
          navigate("/notifications");
        }
        return;
      }

      // Unknown action – go to notifications
      navigate("/notifications");
    };

    try {
      OneSignal.Notifications.addEventListener("click", handleClick);
      console.info("[OneSignal] Click listener registered");
    } catch (err) {
      console.warn("[OneSignal] Failed to register click listener:", err);
    }

    return () => {
      try {
        OneSignal.Notifications.removeEventListener("click", handleClick);
      } catch {
        // ignore
      }
    };
  }, [navigate]);

  return null;
};

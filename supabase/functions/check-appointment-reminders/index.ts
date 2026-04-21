import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ONESIGNAL_APP_ID = "4f9c108a-f328-4f80-b3e0-65ea97f0ea52";

type ReminderType = "24h" | "1h";

interface AppointmentRow {
  id: string;
  scheduled_at: string;
  type: string;
  doctor: string;
  status: string;
  patient_id: string;
}

interface PatientRow {
  id: string;
  name: string;
  phone: string | null;
  platform: string | null;
}

function formatTr(dateStr: string): string {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
}

async function sendOneSignalToAll(title: string, message: string, patientId: string) {
  const restKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
  if (!restKey) {
    console.warn("[check-appointment-reminders] ONESIGNAL_REST_API_KEY not set, skipping push");
    return { skipped: true };
  }
  const res = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${restKey}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["All"],
      headings: { en: title, tr: title },
      contents: { en: message, tr: message },
      data: { patientId, type: "appointment_reminder" },
      url: `https://clinixcrm.lovable.app/patients?patientId=${patientId}`,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[OneSignal] error", res.status, body);
    return { ok: false, status: res.status, body };
  }
  return { ok: true, body };
}

async function notifyN8nWhatsapp(payload: Record<string, unknown>) {
  const url = Deno.env.get("N8N_APPOINTMENT_REMINDER_WEBHOOK_URL");
  if (!url) {
    console.warn("[check-appointment-reminders] N8N webhook URL not set, skipping WhatsApp");
    return { skipped: true };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[n8n] error", res.status, text);
    return { ok: false, status: res.status };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    // Window for 24h reminder: between 23h45m and 24h15m from now
    const t24Min = new Date(now.getTime() + (23 * 60 + 45) * 60 * 1000).toISOString();
    const t24Max = new Date(now.getTime() + (24 * 60 + 15) * 60 * 1000).toISOString();
    // Window for 1h reminder: between 45m and 75m from now
    const t1Min = new Date(now.getTime() + 45 * 60 * 1000).toISOString();
    const t1Max = new Date(now.getTime() + 75 * 60 * 1000).toISOString();

    const fetchWindow = async (min: string, max: string) => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, scheduled_at, type, doctor, status, patient_id")
        .eq("status", "upcoming")
        .gte("scheduled_at", min)
        .lte("scheduled_at", max);
      if (error) throw error;
      return (data ?? []) as AppointmentRow[];
    };

    const [appts24, appts1] = await Promise.all([
      fetchWindow(t24Min, t24Max),
      fetchWindow(t1Min, t1Max),
    ]);

    const allAppts = [
      ...appts24.map((a) => ({ ...a, _kind: "24h" as ReminderType })),
      ...appts1.map((a) => ({ ...a, _kind: "1h" as ReminderType })),
    ];

    if (allAppts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No appointments in window", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out already-sent reminders
    const apptIds = Array.from(new Set(allAppts.map((a) => a.id)));
    const { data: sentRows, error: sentErr } = await supabase
      .from("appointment_reminders_sent")
      .select("appointment_id, reminder_type")
      .in("appointment_id", apptIds);
    if (sentErr) throw sentErr;
    const sentSet = new Set(
      (sentRows ?? []).map((r: any) => `${r.appointment_id}:${r.reminder_type}`)
    );

    const pending = allAppts.filter(
      (a) => !sentSet.has(`${a.id}:${a._kind}`)
    );

    if (pending.length === 0) {
      return new Response(
        JSON.stringify({ message: "All reminders already sent", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch patient info
    const patientIds = Array.from(new Set(pending.map((a) => a.patient_id)));
    const { data: patientsData, error: patErr } = await supabase
      .from("patients")
      .select("id, name, phone, platform")
      .in("id", patientIds);
    if (patErr) throw patErr;
    const patientMap = new Map<string, PatientRow>(
      (patientsData ?? []).map((p: any) => [p.id, p])
    );

    // Fetch all users for in-app notifications
    const { data: { users }, error: usersErr } = await supabase.auth.admin.listUsers();
    if (usersErr) throw usersErr;
    const userIds = (users ?? []).map((u) => u.id);

    let processed = 0;
    const errors: string[] = [];

    for (const appt of pending) {
      const patient = patientMap.get(appt.patient_id);
      if (!patient) {
        errors.push(`Patient not found for appointment ${appt.id}`);
        continue;
      }

      const when = formatTr(appt.scheduled_at);
      const isOneHour = appt._kind === "1h";
      const titleEmoji = isOneHour ? "⏰" : "📅";
      const window = isOneHour ? "1 saat sonra" : "Yarın";
      const title = `${titleEmoji} Randevu Hatırlatıcı: ${patient.name}`;
      const description = `${patient.name} için ${window} (${when}) ${appt.type} randevusu var. Doktor: ${appt.doctor}`;

      // 1) In-app notifications for all staff
      if (userIds.length > 0) {
        const rows = userIds.map((uid) => ({
          user_id: uid,
          type: "appointment",
          title,
          description,
          patient_id: patient.id,
          read: false,
        }));
        const { error: insErr } = await supabase.from("notifications").insert(rows);
        if (insErr) {
          console.error("notifications insert error", insErr);
          errors.push(`notifications: ${insErr.message}`);
        }
      }

      // 2) Push to all subscribed devices
      await sendOneSignalToAll(title, description, patient.id);

      // 3) WhatsApp to patient via n8n
      if (patient.phone) {
        await notifyN8nWhatsapp({
          event: "appointment_reminder",
          reminder_type: appt._kind,
          appointment_id: appt.id,
          scheduled_at: appt.scheduled_at,
          scheduled_at_formatted: when,
          type: appt.type,
          doctor: appt.doctor,
          patient: {
            id: patient.id,
            name: patient.name,
            phone: patient.phone,
            platform: patient.platform,
          },
        });
      }

      // 4) Mark as sent
      const { error: markErr } = await supabase
        .from("appointment_reminders_sent")
        .insert({ appointment_id: appt.id, reminder_type: appt._kind });
      if (markErr) {
        console.error("mark sent error", markErr);
        errors.push(`mark: ${markErr.message}`);
      } else {
        processed++;
      }
    }

    return new Response(
      JSON.stringify({ message: "Processed", processed, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("check-appointment-reminders fatal", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

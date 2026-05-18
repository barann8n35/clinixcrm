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
  user_id: string | null;
}

async function triggerVoiceCall(
  appointmentId: string,
  patientId: string,
  toPhone: string,
  clinicUserId: string,
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/place-outbound-call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        internal: true,
        target_user_id: clinicUserId,
        appointment_id: appointmentId,
        patient_id: patientId,
        to_number: toPhone,
        call_type: "appointment_reminder",
      }),
    });
    const body = await res.json().catch(() => ({}));
    console.log("[voice-call] appt", appointmentId, "→", res.status, body);
    return body;
  } catch (err) {
    console.error("[voice-call] error", err);
    return null;
  }
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

/**
 * Sends a OneSignal push targeted at SPECIFIC subscription IDs (not segments).
 * Uses a stable `external_id` (collapse_id) per appointment+kind so duplicates
 * arriving on the same device replace each other instead of stacking.
 */
async function sendOneSignalToSubscriptions(
  subscriptionIds: string[],
  title: string,
  message: string,
  patientId: string,
  collapseId: string,
) {
  const restKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
  if (!restKey) {
    console.warn("[push] ONESIGNAL_REST_API_KEY not set, skipping");
    return { skipped: true };
  }
  if (!subscriptionIds.length) {
    console.warn("[push] no subscriptions, skipping");
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
      include_subscription_ids: subscriptionIds,
      // Use a unique topic so notifications don't get stuck waiting for the previous one to be dismissed
      web_push_topic: crypto.randomUUID(),
      // 1 hour TTL — stale notifications expire on the device
      ttl: 3600,
      headings: { en: title, tr: title },
      contents: { en: message, tr: message },
      data: { patientId, type: "appointment_reminder", collapseId },
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
  if (!url) return { skipped: true };
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
    // Cron runs every 15 min → use a 15-min lookahead window per kind
    // 24h reminder window: now+23h45m → now+24h00m  (15 min wide)
    const t24Min = new Date(now.getTime() + 23 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString();
    const t24Max = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    // 1h reminder window: now+45m → now+60m
    const t1Min = new Date(now.getTime() + 45 * 60 * 1000).toISOString();
    const t1Max = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

    const fetchWindow = async (min: string, max: string) => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, scheduled_at, type, doctor, status, patient_id")
        .eq("status", "upcoming")
        .gte("scheduled_at", min)
        .lt("scheduled_at", max);
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
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Filter out already-sent (defense-in-depth; insert below has unique guard)
    const apptIds = Array.from(new Set(allAppts.map((a) => a.id)));
    const { data: sentRows } = await supabase
      .from("appointment_reminders_sent")
      .select("appointment_id, reminder_type")
      .in("appointment_id", apptIds);
    const sentSet = new Set(
      (sentRows ?? []).map((r: any) => `${r.appointment_id}:${r.reminder_type}`),
    );

    const pending = allAppts.filter((a) => !sentSet.has(`${a.id}:${a._kind}`));
    if (pending.length === 0) {
      return new Response(
        JSON.stringify({ message: "All reminders already sent", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Patient info
    const patientIds = Array.from(new Set(pending.map((a) => a.patient_id)));
    const { data: patientsData } = await supabase
      .from("patients")
      .select("id, name, phone, platform, user_id")
      .in("id", patientIds);
    const patientMap = new Map<string, PatientRow>(
      (patientsData ?? []).map((p: any) => [p.id, p]),
    );

    // Voice agent settings per clinic — to decide if we should auto-call
    const clinicUserIds = Array.from(
      new Set((patientsData ?? []).map((p: any) => p.user_id).filter(Boolean) as string[]),
    );
    const { data: voiceSettings } = await supabase
      .from("voice_agent_settings")
      .select("user_id, auto_call_appointment_reminders")
      .in("user_id", clinicUserIds.length ? clinicUserIds : ["__none__"]);
    const voiceMap = new Map<string, boolean>(
      (voiceSettings ?? []).map((v: any) => [v.user_id, !!v.auto_call_appointment_reminders]),
    );

    // Active staff (only those with role assigned, not 'pending')
    const { data: activeRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .neq("role", "pending");
    const activeUserIds = Array.from(
      new Set((activeRoles ?? []).map((r: any) => r.user_id as string)),
    );

    // Push subscriptions for active users only
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("user_id, endpoint")
      .in("user_id", activeUserIds.length ? activeUserIds : ["__none__"]);
    const subscriptionIds = Array.from(
      new Set((subs ?? []).map((s: any) => s.endpoint as string).filter(Boolean)),
    );

    let processed = 0;
    const errors: string[] = [];

    for (const appt of pending) {
      const patient = patientMap.get(appt.patient_id);
      if (!patient) {
        errors.push(`Patient not found for appointment ${appt.id}`);
        continue;
      }

      // 1) CLAIM the reminder slot FIRST — if this fails (unique violation),
      // another concurrent run already handled it; skip silently.
      const { error: claimErr } = await supabase
        .from("appointment_reminders_sent")
        .insert({ appointment_id: appt.id, reminder_type: appt._kind });
      if (claimErr) {
        // Likely 23505 unique_violation → already sent
        console.info(`[skip] ${appt.id}:${appt._kind} already claimed`);
        continue;
      }

      const when = formatTr(appt.scheduled_at);
      const isOneHour = appt._kind === "1h";
      const titleEmoji = isOneHour ? "⏰" : "📅";
      const window = isOneHour ? "1 saat sonra" : "Yarın";
      const title = `${titleEmoji} Randevu: ${patient.name}`;
      const description = `${patient.name} için ${window} (${when}) ${appt.type} randevusu var. Doktor: ${appt.doctor}`;
      const collapseId = `appt-${appt.id}-${appt._kind}`;

      // 2) In-app notifications for active staff only
      if (activeUserIds.length > 0) {
        const rows = activeUserIds.map((uid) => ({
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
          errors.push(`notif: ${insErr.message}`);
        }
      }

      // 3) Push only to subscribed devices (not "All" segment)
      await sendOneSignalToSubscriptions(
        subscriptionIds,
        title,
        description,
        patient.id,
        collapseId,
      );

      // 4) WhatsApp via n8n
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

      processed++;
    }

    return new Response(
      JSON.stringify({ message: "Processed", processed, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("check-appointment-reminders fatal", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

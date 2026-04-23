import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cron-invoked function that finds appointments needing voice reminder calls
// (24h ahead and 1h ahead) and triggers outbound calls via place-outbound-call.

const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";

interface AppointmentRow {
  id: string;
  patient_id: string;
  scheduled_at: string;
  doctor: string | null;
  type: string;
}

async function callPatient(
  admin: ReturnType<typeof createClient>,
  appt: AppointmentRow,
  patient: { name: string; phone: string | null },
  callType: "appointment_reminder_24h" | "appointment_reminder_1h",
  message: string,
  twilioFrom: string,
  lovableKey: string,
  twilioKey: string,
  supabaseUrl: string,
) {
  if (!patient.phone) {
    console.warn(`[trigger-appointment-calls] patient ${appt.patient_id} has no phone`);
    return;
  }
  let to = patient.phone.trim();
  if (!to.startsWith("+")) {
    const digits = to.replace(/\D/g, "");
    to = digits.startsWith("90") ? `+${digits}` : `+90${digits.replace(/^0/, "")}`;
  }

  const { data: callRow, error: insertErr } = await admin
    .from("voice_calls")
    .insert({
      patient_id: appt.patient_id,
      appointment_id: appt.id,
      direction: "outbound",
      call_type: callType,
      status: "queued",
      to_number: to,
      from_number: twilioFrom,
    })
    .select("id")
    .single();
  if (insertErr) throw insertErr;
  const callId = callRow.id as string;

  const twimlUrl = `${supabaseUrl}/functions/v1/voice-twiml-handler?call_id=${callId}&msg=${
    encodeURIComponent(message)
  }`;
  const statusUrl = `${supabaseUrl}/functions/v1/voice-status-webhook?call_id=${callId}`;

  const formBody = new URLSearchParams({
    To: to,
    From: twilioFrom,
    Url: twimlUrl,
    StatusCallback: statusUrl,
    StatusCallbackMethod: "POST",
    Record: "true",
    RecordingStatusCallback: statusUrl,
  });
  formBody.append("StatusCallbackEvent", "completed");

  const res = await fetch(`${TWILIO_GATEWAY}/Calls.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody,
  });
  const json = await res.json();

  if (!res.ok) {
    await admin
      .from("voice_calls")
      .update({
        status: "failed",
        error_message: `Twilio ${res.status}: ${JSON.stringify(json)}`,
      })
      .eq("id", callId);
    return;
  }

  await admin
    .from("voice_calls")
    .update({ status: "initiated", twilio_call_sid: json.sid })
    .eq("id", callId);

  // Mark reminder as sent
  await admin.from("appointment_reminders_sent").insert({
    appointment_id: appt.id,
    reminder_type: `voice_${callType}`,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const TWILIO_FROM = Deno.env.get("TWILIO_PHONE_NUMBER")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY")!;

    if (!TWILIO_FROM || !LOVABLE_API_KEY || !TWILIO_API_KEY) {
      throw new Error("Missing required secrets");
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Check master settings — must be enabled
    const { data: settings } = await admin
      .from("voice_agent_settings")
      .select("auto_call_appointment_reminders, call_window_start, call_window_end")
      .limit(1)
      .maybeSingle();

    if (!settings?.auto_call_appointment_reminders) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "auto_call_appointment_reminders is disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Window guard (Istanbul time approx: server UTC + 3h)
    const nowUtc = new Date();
    const istHour = (nowUtc.getUTCHours() + 3) % 24;
    const startHour = parseInt((settings.call_window_start ?? "09:00").split(":")[0], 10);
    const endHour = parseInt((settings.call_window_end ?? "20:00").split(":")[0], 10);
    if (istHour < startHour || istHour >= endHour) {
      return new Response(
        JSON.stringify({ ok: true, skipped: `outside call window (${istHour}h IST)` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const now = new Date();
    const window24Start = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const window24End = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const window1Start = new Date(now.getTime() + 30 * 60 * 1000);
    const window1End = new Date(now.getTime() + 90 * 60 * 1000);

    const processed: Record<string, number> = { "24h": 0, "1h": 0 };

    for (const [label, start, end, callType] of [
      ["24h", window24Start, window24End, "appointment_reminder_24h"],
      ["1h", window1Start, window1End, "appointment_reminder_1h"],
    ] as const) {
      const { data: appts } = await admin
        .from("appointments")
        .select("id, patient_id, scheduled_at, doctor, type")
        .gte("scheduled_at", start.toISOString())
        .lte("scheduled_at", end.toISOString())
        .in("status", ["upcoming", "confirmed"]);

      if (!appts || appts.length === 0) continue;

      // Filter out already-called
      const ids = appts.map((a) => a.id);
      const { data: alreadySent } = await admin
        .from("appointment_reminders_sent")
        .select("appointment_id, reminder_type")
        .in("appointment_id", ids)
        .eq("reminder_type", `voice_${callType}`);
      const sentSet = new Set((alreadySent ?? []).map((r) => r.appointment_id));
      const todo = (appts as AppointmentRow[]).filter((a) => !sentSet.has(a.id));

      for (const appt of todo) {
        const { data: patient } = await admin
          .from("patients")
          .select("name, phone")
          .eq("id", appt.patient_id)
          .maybeSingle();

        if (!patient?.phone) continue;

        const apptTime = new Date(appt.scheduled_at).toLocaleString("tr-TR", {
          timeZone: "Europe/Istanbul",
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        });

        const message = label === "24h"
          ? `Merhaba ${patient.name}, ben Clinix asistanı. ${apptTime} tarihinde ${
            appt.doctor ?? "doktorumuz"
          } ile randevunuz olduğunu hatırlatmak istedim.`
          : `Merhaba ${patient.name}, randevunuz yaklaşıyor. Bir saat sonra ${
            appt.doctor ?? "doktorumuz"
          } sizi bekliyor.`;

        await callPatient(
          admin,
          appt,
          patient,
          callType,
          message,
          TWILIO_FROM,
          LOVABLE_API_KEY,
          TWILIO_API_KEY,
          SUPABASE_URL,
        );
        processed[label]++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, processed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[trigger-appointment-calls] error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

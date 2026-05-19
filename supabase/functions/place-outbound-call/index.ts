// Places an outbound call via ElevenLabs' native Twilio integration.
// All agent behavior (voice/prompt/greeting/language) lives in the
// ElevenLabs dashboard. This function only:
//   1) enforces Clinix-side triggers (daily limit, call window)
//   2) logs the call in voice_calls
//   3) tells ElevenLabs to dial the number through the linked Twilio phone

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlaceCallBody {
  patient_id?: string;
  appointment_id?: string;
  to_number?: string;
  call_type?: string;
  initial_message?: string;
  // when invoked internally by another edge function (cron), we skip user auth
  // and rely on a service-role caller. The target clinic's settings are
  // resolved via target_user_id.
  internal?: boolean;
  target_user_id?: string;
  bypass_triggers?: boolean; // for manual test calls
}

function isWithinWindow(start: string, end: string, now = new Date()): boolean {
  // start/end like "09:00:00"
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  return cur >= s && cur <= e;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const ELEVENLABS_AGENT_ID = Deno.env.get("ELEVENLABS_AGENT_ID");
    const ELEVENLABS_PHONE_NUMBER_ID = Deno.env.get("ELEVENLABS_PHONE_NUMBER_ID");

    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY is not configured");
    if (!ELEVENLABS_AGENT_ID) throw new Error("ELEVENLABS_AGENT_ID is not configured");
    if (!ELEVENLABS_PHONE_NUMBER_ID) throw new Error("ELEVENLABS_PHONE_NUMBER_ID is not configured");

    const body: PlaceCallBody = await req.json().catch(() => ({}));
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Resolve caller user id
    let callerId: string | null = null;
    let clinicUserId: string | null = body.target_user_id ?? null;

    if (!body.internal) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser(
        authHeader.replace("Bearer ", ""),
      );
      if (userErr || !userData?.user?.id) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerId = userData.user.id;
      clinicUserId = clinicUserId ?? callerId;
    }

    // Resolve destination phone number
    let toPhone = body.to_number?.trim();
    if (!toPhone && body.patient_id) {
      const { data: patient } = await admin
        .from("patients")
        .select("phone, user_id")
        .eq("id", body.patient_id)
        .maybeSingle();
      toPhone = patient?.phone?.trim();
      if (!clinicUserId && patient?.user_id) clinicUserId = patient.user_id;
    }
    if (!toPhone) {
      return new Response(
        JSON.stringify({ error: "No phone number resolved for this call" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!toPhone.startsWith("+")) {
      const digits = toPhone.replace(/\D/g, "");
      toPhone = digits.startsWith("90") ? `+${digits}` : `+90${digits.replace(/^0/, "")}`;
    }

    // ---- Clinix triggers / guards (skipped for manual UI test calls) ----
    if (!body.bypass_triggers && clinicUserId) {
      const { data: settings } = await admin
        .from("voice_agent_settings")
        .select("always_on, call_window_start, call_window_end, daily_call_limit")
        .eq("user_id", clinicUserId)
        .maybeSingle();

      if (settings) {
        // Time window
        if (!settings.always_on) {
          if (!isWithinWindow(settings.call_window_start, settings.call_window_end)) {
            return new Response(
              JSON.stringify({
                ok: false,
                blocked: "OUTSIDE_CALL_WINDOW",
                message: `Arama saati dışında (${settings.call_window_start.slice(0, 5)}-${settings.call_window_end.slice(0, 5)}).`,
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        }
        // Daily limit
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const { count } = await admin
          .from("voice_calls")
          .select("id", { count: "exact", head: true })
          .eq("user_id", clinicUserId)
          .gte("created_at", startOfDay.toISOString());
        if ((count ?? 0) >= (settings.daily_call_limit ?? 100)) {
          return new Response(
            JSON.stringify({
              ok: false,
              blocked: "DAILY_LIMIT_REACHED",
              message: `Günlük arama limiti (${settings.daily_call_limit}) doldu.`,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    // Insert pending call record
    const { data: callRow, error: insertErr } = await admin
      .from("voice_calls")
      .insert({
        user_id: clinicUserId,
        patient_id: body.patient_id ?? null,
        appointment_id: body.appointment_id ?? null,
        direction: "outbound",
        call_type: body.call_type ?? "manual",
        status: "queued",
        to_number: toPhone,
        from_number: null,
        initiated_by: callerId,
      })
      .select("id")
      .single();
    if (insertErr) throw insertErr;
    const callId = callRow.id as string;

    // Resolve patient name for dynamic variables (helps agent open the call faster)
    let patientName = "";
    if (body.patient_id) {
      const { data: p } = await admin
        .from("patients")
        .select("name")
        .eq("id", body.patient_id)
        .maybeSingle();
      patientName = p?.name ?? "";
    }

    const callType = body.call_type ?? "manual";
    // Only override first_message when caller explicitly provided one.
    // Otherwise let the ElevenLabs dashboard agent's "First message" be used.
    const explicitFirstMessage = body.initial_message?.trim();
    const agentOverride: Record<string, unknown> = { language: "tr" };
    if (explicitFirstMessage) {
      agentOverride.first_message = explicitFirstMessage.slice(0, 500);
    }

    const initiationData: Record<string, unknown> = {
      conversation_config_override: {
        agent: agentOverride,
      },
      dynamic_variables: {
        patient_name: patientName || "Misafir",
        call_type: callType,
        appointment_id: body.appointment_id ?? "",
        patient_id: body.patient_id ?? "",
      },
    };

    // Place call via ElevenLabs native Twilio outbound
    const elevenRes = await fetch(
      "https://api.elevenlabs.io/v1/convai/twilio/outbound-call",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: ELEVENLABS_AGENT_ID,
          agent_phone_number_id: ELEVENLABS_PHONE_NUMBER_ID,
          to_number: toPhone,
          call_recording_enabled: true,
          telephony_call_config: { ringing_timeout_secs: 30 },
          conversation_initiation_client_data: initiationData,
        }),
      },
    );
    const elevenJson = await elevenRes.json().catch(() => ({}));
    console.log("[place-outbound-call] eleven response", elevenRes.status, JSON.stringify(elevenJson));

    if (!elevenRes.ok || elevenJson?.success === false) {
      await admin
        .from("voice_calls")
        .update({
          status: "failed",
          error_message: `ElevenLabs ${elevenRes.status}: ${JSON.stringify(elevenJson)}`,
        })
        .eq("id", callId);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "ELEVENLABS_CALL_FAILED",
          message: elevenJson?.message ?? elevenJson?.detail ?? "ElevenLabs call failed",
          details: elevenJson,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await admin
      .from("voice_calls")
      .update({
        status: "initiated",
        twilio_call_sid: elevenJson.callSid ?? elevenJson.call_sid ?? null,
        conversation_id: elevenJson.conversation_id ?? null,
      })
      .eq("id", callId);

    return new Response(
      JSON.stringify({
        ok: true,
        call_id: callId,
        twilio_sid: elevenJson.callSid ?? elevenJson.call_sid ?? null,
        conversation_id: elevenJson.conversation_id ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[place-outbound-call] error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

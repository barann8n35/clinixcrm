import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";

interface PlaceCallBody {
  patient_id?: string;
  appointment_id?: string;
  to_number?: string;
  call_type?: string;
  initial_message?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const TWILIO_FROM = Deno.env.get("TWILIO_PHONE_NUMBER");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");

    if (!TWILIO_FROM) throw new Error("TWILIO_PHONE_NUMBER is not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY is not configured");

    // Verify caller
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
    const callerId = userData.user.id;

    const body: PlaceCallBody = await req.json().catch(() => ({}));
    const { patient_id, appointment_id, to_number, call_type, initial_message } = body;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Resolve destination phone number
    let toPhone = to_number?.trim();
    if (!toPhone && patient_id) {
      const { data: patient } = await admin
        .from("patients")
        .select("phone, name")
        .eq("id", patient_id)
        .maybeSingle();
      toPhone = patient?.phone?.trim();
    }

    if (!toPhone) {
      return new Response(
        JSON.stringify({ error: "No phone number resolved for this call" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Normalize to E.164 (best-effort: prepend +90 if missing)
    if (!toPhone.startsWith("+")) {
      const digits = toPhone.replace(/\D/g, "");
      toPhone = digits.startsWith("90") ? `+${digits}` : `+90${digits.replace(/^0/, "")}`;
    }

    // Insert pending call record
    const { data: callRow, error: insertErr } = await admin
      .from("voice_calls")
      .insert({
        patient_id: patient_id ?? null,
        appointment_id: appointment_id ?? null,
        direction: "outbound",
        call_type: call_type ?? "manual",
        status: "queued",
        to_number: toPhone,
        from_number: TWILIO_FROM,
        initiated_by: callerId,
      })
      .select("id")
      .single();
    if (insertErr) throw insertErr;
    const callId = callRow.id as string;

    // Build TwiML webhook URL pointing to our handler
    const twimlUrl = `${SUPABASE_URL}/functions/v1/voice-twiml-handler?call_id=${callId}${
      initial_message ? `&msg=${encodeURIComponent(initial_message)}` : ""
    }`;
    const statusUrl = `${SUPABASE_URL}/functions/v1/voice-status-webhook?call_id=${callId}`;

    // Place call via Twilio Gateway
    const formBody = new URLSearchParams({
      To: toPhone,
      From: TWILIO_FROM,
      Url: twimlUrl,
      StatusCallback: statusUrl,
      "StatusCallbackEvent": "initiated",
      "StatusCallbackMethod": "POST",
      Record: "true",
      RecordingStatusCallback: statusUrl,
    });
    // Add multiple StatusCallbackEvent values
    formBody.append("StatusCallbackEvent", "ringing");
    formBody.append("StatusCallbackEvent", "answered");
    formBody.append("StatusCallbackEvent", "completed");

    const twilioRes = await fetch(`${TWILIO_GATEWAY}/Calls.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody,
    });
    const twilioJson = await twilioRes.json();

    if (!twilioRes.ok) {
      await admin
        .from("voice_calls")
        .update({
          status: "failed",
          error_message: `Twilio ${twilioRes.status}: ${JSON.stringify(twilioJson)}`,
        })
        .eq("id", callId);
      return new Response(
        JSON.stringify({ error: "Twilio call failed", details: twilioJson }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await admin
      .from("voice_calls")
      .update({ status: "initiated", twilio_call_sid: twilioJson.sid })
      .eq("id", callId);

    return new Response(
      JSON.stringify({ ok: true, call_id: callId, twilio_sid: twilioJson.sid }),
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

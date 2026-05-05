import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Public webhook called by Twilio. Returns TwiML XML that connects the call
// to the ElevenLabs Conversational AI agent via a Media Stream.
// NOTE: ElevenLabs Conversational AI must have "Twilio integration" enabled
// for the chosen agent — that exposes the wss://api.elevenlabs.io/v1/convai/conversation
// endpoint that accepts Twilio's media stream protocol.

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const callId = url.searchParams.get("call_id");
    const customMessage = url.searchParams.get("msg");

    const ELEVENLABS_AGENT_ID = Deno.env.get("ELEVENLABS_AGENT_ID");
    if (!ELEVENLABS_AGENT_ID) {
      throw new Error("ELEVENLABS_AGENT_ID is not configured");
    }

    // Fetch agent settings + patient context for personalization
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    let greeting = customMessage ?? "";
    let patientName = "";
    let voiceId = "";
    let language = "tr";
    let persona = "";
    let clinicName = "";
    let doctorName = "";

    if (callId) {
      const { data: call } = await admin
        .from("voice_calls")
        .select("patient_id, call_type, appointment_id")
        .eq("id", callId)
        .maybeSingle();

      if (call?.patient_id) {
        const { data: patient } = await admin
          .from("patients")
          .select("name, surname")
          .eq("id", call.patient_id)
          .maybeSingle();
        patientName = [patient?.name, patient?.surname].filter(Boolean).join(" ").trim();
      }
    }

    const { data: settings } = await admin
      .from("voice_agent_settings")
      .select("greeting_message, clinic_name, voice_id, language, agent_persona, doctor_name")
      .limit(1)
      .maybeSingle();
    if (!greeting) {
      greeting = settings?.greeting_message ?? "Merhaba, size nasıl yardımcı olabilirim?";
    }
    voiceId = settings?.voice_id ?? "";
    language = settings?.language ?? "tr";
    persona = settings?.agent_persona ?? "";
    clinicName = settings?.clinic_name ?? "";
    doctorName = settings?.doctor_name ?? "";


    // Build the ElevenLabs Conversational AI WebSocket URL
    const elevenWsUrl =
      `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${ELEVENLABS_AGENT_ID}`;

    const safeGreeting = (greeting || "Merhaba")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const esc = (s: string) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    // Voice/agent overrides passed to ElevenLabs via Twilio <Stream> Parameters.
    // NOTE: The ElevenLabs agent must have these overrides enabled in its dashboard
    // (Security → Overrides: voice_id, language, prompt, first_message).
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Filiz" language="tr-TR">${safeGreeting}</Say>
  <Connect>
    <Stream url="${elevenWsUrl}">
      <Parameter name="patient_name" value="${esc(patientName)}" />
      <Parameter name="call_id" value="${callId ?? ""}" />
      <Parameter name="voice_id" value="${esc(voiceId ?? "")}" />
      <Parameter name="language" value="${esc(language ?? "tr")}" />
      <Parameter name="first_message" value="${esc(greeting)}" />
      <Parameter name="prompt" value="${esc(`Sen ${clinicName} kliniğinin asistanısın. Doktor: ${doctorName}. ${persona}`)}" />
    </Stream>
  </Connect>
</Response>`;

    return new Response(twiml, {
      status: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[voice-twiml-handler] error:", message);
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Filiz" language="tr-TR">Bir hata oluştu, lütfen daha sonra tekrar deneyin.</Say>
  <Hangup/>
</Response>`;
    return new Response(fallback, {
      status: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  }
});

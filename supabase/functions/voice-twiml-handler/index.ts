// Public webhook called by Twilio. Returns TwiML XML that connects the call
// directly to the ElevenLabs Conversational AI agent via a Media Stream.
//
// All agent behavior (prompt, voice, language, first message) is managed in
// the ElevenLabs dashboard. Clinix does NOT inject any overrides — each doctor
// is configured per-agent inside ElevenLabs.

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const callId = url.searchParams.get("call_id") ?? "";

    const ELEVENLABS_AGENT_ID = Deno.env.get("ELEVENLABS_AGENT_ID");
    if (!ELEVENLABS_AGENT_ID) {
      throw new Error("ELEVENLABS_AGENT_ID is not configured");
    }

    const elevenWsUrl =
      `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${ELEVENLABS_AGENT_ID}`;

    const esc = (s: string) =>
      (s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${elevenWsUrl}">
      <Parameter name="call_id" value="${esc(callId)}" />
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

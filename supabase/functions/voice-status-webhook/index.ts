import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Public webhook called by Twilio for both Call Status events and Recording Status events.
// Updates the voice_calls row with status, duration, and recording URL.

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const callId = url.searchParams.get("call_id");
    if (!callId) {
      return new Response("Missing call_id", { status: 400 });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Twilio sends application/x-www-form-urlencoded
    const formData = await req.formData();
    const fields: Record<string, string> = {};
    formData.forEach((v, k) => {
      fields[k] = String(v);
    });

    console.info("[voice-status-webhook]", callId, fields);

    const updates: Record<string, unknown> = {};

    // Recording event
    if (fields.RecordingUrl) {
      updates.recording_url = fields.RecordingUrl;
    }

    // Call status event
    if (fields.CallStatus) {
      const status = fields.CallStatus;
      updates.status = status;
      if (["completed", "busy", "no-answer", "failed", "canceled"].includes(status)) {
        updates.completed_at = new Date().toISOString();
      }
    }

    if (fields.CallDuration) {
      const dur = parseInt(fields.CallDuration, 10);
      if (!Number.isNaN(dur)) updates.duration_seconds = dur;
    }

    if (Object.keys(updates).length > 0) {
      await admin.from("voice_calls").update(updates).eq("id", callId);
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[voice-status-webhook] error:", message);
    return new Response("error", { status: 200 }); // Always 200 so Twilio doesn't retry forever
  }
});

// Public webhook called by ElevenLabs Conversational AI (Post-call webhook).
// Logs inbound calls into voice_calls table for CRM visibility.
// No JWT verification: caller is ElevenLabs' server.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("+")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("90")) return `+${digits}`;
  return `+90${digits.replace(/^0/, "")}`;
}

function transcriptToText(transcript: any): string | null {
  if (!transcript) return null;
  if (typeof transcript === "string") return transcript;
  if (Array.isArray(transcript)) {
    return transcript
      .map((t: any) => {
        const role = t.role || t.speaker || "agent";
        const msg = t.message ?? t.text ?? "";
        return `${role}: ${msg}`;
      })
      .join("\n");
  }
  return JSON.stringify(transcript);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const raw = await req.json().catch(() => ({}));
    console.log("[voice-inbound-webhook] payload", JSON.stringify(raw).slice(0, 2000));

    // ElevenLabs post-call webhook shapes vary; pluck common fields defensively.
    const data = raw?.data ?? raw;
    const conversationId: string | null =
      data?.conversation_id ?? data?.conversationId ?? raw?.conversation_id ?? null;
    const meta = data?.metadata ?? data?.conversation_initiation_metadata ?? {};
    const phoneCall = meta?.phone_call ?? data?.phone_call ?? {};
    const direction: string =
      (phoneCall?.direction ?? meta?.direction ?? "inbound").toString().toLowerCase();
    const fromNumber = normalizePhone(
      phoneCall?.external_number ?? phoneCall?.from ?? meta?.from_number ?? null,
    );
    const toNumber = normalizePhone(
      phoneCall?.agent_number ?? phoneCall?.to ?? meta?.to_number ?? null,
    );
    const transcript = transcriptToText(data?.transcript ?? raw?.transcript);
    const summary: string | null =
      data?.analysis?.transcript_summary ?? data?.summary ?? null;
    const durationSeconds: number | null =
      data?.metadata?.call_duration_secs ?? data?.duration_seconds ?? null;
    const status: string =
      data?.status === "done" || data?.status === "completed" ? "completed" : "completed";

    // Resolve clinic owner (primary admin)
    const { data: ownerRow } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();
    const clinicUserId = ownerRow?.user_id as string | undefined;

    // Try to link patient by phone (inbound = from caller)
    let patientId: string | null = null;
    if (fromNumber) {
      const { data: patient } = await admin
        .from("patients")
        .select("id")
        .eq("phone", fromNumber)
        .limit(1)
        .maybeSingle();
      patientId = (patient?.id as string) ?? null;
    }

    // If conversation already logged (outbound), update it; else insert inbound row.
    if (conversationId) {
      const { data: existing } = await admin
        .from("voice_calls")
        .select("id")
        .eq("conversation_id", conversationId)
        .limit(1)
        .maybeSingle();
      if (existing?.id) {
        await admin
          .from("voice_calls")
          .update({
            transcript,
            summary,
            duration_seconds: durationSeconds,
            status,
            completed_at: new Date().toISOString(),
            patient_id: patientId,
          })
          .eq("id", existing.id);
        return json({ success: true, updated: true, id: existing.id });
      }
    }

    const { data: inserted, error: insErr } = await admin
      .from("voice_calls")
      .insert({
        user_id: clinicUserId ?? null,
        patient_id: patientId,
        direction: direction === "outbound" ? "outbound" : "inbound",
        call_type: "inbound",
        status,
        conversation_id: conversationId,
        transcript,
        summary,
        duration_seconds: durationSeconds,
        from_number: fromNumber,
        to_number: toNumber,
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insErr) {
      console.error("[voice-inbound-webhook] insert error", insErr);
      return json({ success: false, error: insErr.message }, 500);
    }

    return json({ success: true, id: inserted.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[voice-inbound-webhook] error", message);
    return json({ success: false, error: message }, 500);
  }
});

// Public endpoint: receives messages from the embedded web widget on clinic websites.
// No JWT required — uses anon access. Calls the existing handle_omnichannel_message RPC.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Very simple in-memory rate limit (per IP, per minute) — production should use Redis
const RATE_LIMIT = 10;
const WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimitOk(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (b.count >= RATE_LIMIT) return false;
  b.count++;
  return true;
}

function sanitize(s: string, max: number): string {
  return s.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    if (!rateLimitOk(ip)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const sessionId = sanitize(String(body.session_id || ""), 100);
    const name = sanitize(String(body.name || "Web Ziyaretçi"), 80);
    const phone = sanitize(String(body.phone || ""), 30);
    const message = sanitize(String(body.message || ""), 2000);

    if (!sessionId || !message) {
      return new Response(JSON.stringify({ error: "session_id and message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Compose a richer name when phone is provided
    const displayName = phone ? `${name} (${phone})` : name;

    const { data, error } = await admin.rpc("handle_omnichannel_message", {
      p_platform: "web",
      p_external_id: sessionId,
      p_name: displayName,
      p_message: message,
    });

    if (error) {
      console.error("widget-message rpc error", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If phone was provided, persist it on the patient record (best-effort)
    if (phone && data) {
      await admin.from("patients").update({ phone }).eq("id", data).is("phone", null);
    }

    return new Response(JSON.stringify({ ok: true, patient_id: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("widget-message fatal", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

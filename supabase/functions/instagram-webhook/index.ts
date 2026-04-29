// Public webhook for Meta/Instagram Messaging.
// GET  -> verification challenge (hub.mode=subscribe)
// POST -> message events; HMAC-SHA256 signature verified via META_APP_SECRET
// Routes inbound DMs into handle_omnichannel_message RPC.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META_APP_SECRET = Deno.env.get("META_APP_SECRET") || "";
const META_VERIFY_TOKEN = Deno.env.get("META_VERIFY_TOKEN") || "";
const IG_PAGE_ACCESS_TOKEN = Deno.env.get("INSTAGRAM_PAGE_ACCESS_TOKEN") || "";

async function verifySignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!signatureHeader || !META_APP_SECRET) return false;
  const expectedPrefix = "sha256=";
  if (!signatureHeader.startsWith(expectedPrefix)) return false;
  const provided = signatureHeader.slice(expectedPrefix.length);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(META_APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time compare
  if (computed.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ provided.charCodeAt(i);
  return diff === 0;
}

async function fetchSenderName(igUserId: string): Promise<string> {
  if (!IG_PAGE_ACCESS_TOKEN) return "Instagram Kullanıcısı";
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}?fields=name,username&access_token=${IG_PAGE_ACCESS_TOKEN}`,
    );
    if (!res.ok) return "Instagram Kullanıcısı";
    const j = await res.json();
    return j.name || j.username || "Instagram Kullanıcısı";
  } catch {
    return "Instagram Kullanıcısı";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);

  // 1) Verification handshake
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token && token === META_VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  // 2) Event delivery — verify signature on raw body
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const ok = await verifySignature(rawBody, signature);
  if (!ok) {
    console.warn("instagram-webhook: invalid signature");
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Instagram messaging payload shape:
    // { object: "instagram", entry: [{ id, time, messaging: [{ sender:{id}, recipient:{id}, message:{ text } }] }] }
    const entries = Array.isArray(payload?.entry) ? payload.entry : [];
    for (const entry of entries) {
      const events = Array.isArray(entry?.messaging) ? entry.messaging : [];
      for (const ev of events) {
        const senderId = ev?.sender?.id;
        const text = ev?.message?.text;
        const isEcho = ev?.message?.is_echo === true;
        if (!senderId || !text || isEcho) continue;

        const name = await fetchSenderName(senderId);
        const { error } = await admin.rpc("handle_omnichannel_message", {
          p_platform: "instagram",
          p_external_id: senderId,
          p_name: name,
          p_message: String(text).slice(0, 2000),
        });
        if (error) console.error("rpc error", error);
      }
    }
  } catch (e) {
    console.error("instagram-webhook processing error", e);
  }

  // Always 200 to Meta to avoid retries storms once we accepted it
  return new Response("EVENT_RECEIVED", { status: 200, headers: corsHeaders });
});

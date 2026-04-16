// Clone a user's voice via ElevenLabs Instant Voice Cloning
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("Missing authorization");

    // Identify user
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { clone_id } = await req.json();
    if (!clone_id) throw new Error("clone_id required");

    // Load voice clone record
    const { data: vc, error: vcErr } = await admin
      .from("voice_clones")
      .select("*")
      .eq("id", clone_id)
      .maybeSingle();
    if (vcErr || !vc) throw new Error("voice_clone not found");
    if (vc.user_id !== user.id) throw new Error("Forbidden");
    if (!vc.sample_url) throw new Error("sample_url missing");

    // Fetch the audio sample
    const audioResp = await fetch(vc.sample_url);
    if (!audioResp.ok) throw new Error(`Failed to fetch sample: ${audioResp.status}`);
    const audioBlob = await audioResp.blob();

    // Build multipart form for ElevenLabs
    const form = new FormData();
    form.append("name", vc.name || `voice_${user.id.slice(0, 8)}`);
    form.append("description", "Cloned voice for medical/clinic dubbing");
    form.append("files", audioBlob, "sample.mp3");

    const elResp = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      body: form,
    });

    if (!elResp.ok) {
      const errText = await elResp.text();
      await admin
        .from("voice_clones")
        .update({ status: "failed", error_message: errText.slice(0, 1000) })
        .eq("id", clone_id);
      throw new Error(`ElevenLabs error ${elResp.status}: ${errText}`);
    }

    const json = await elResp.json();
    const voiceId = json.voice_id;

    await admin
      .from("voice_clones")
      .update({ status: "ready", elevenlabs_voice_id: voiceId, error_message: null })
      .eq("id", clone_id);

    return new Response(JSON.stringify({ ok: true, voice_id: voiceId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("clone-voice error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Generate a lip-sync video via Sync.so given a video + audio URL
// Polls until complete, then writes lipsync_url back to video_translations.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYNC_SO_API_KEY = Deno.env.get("SYNC_SO_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function pollSyncJob(jobId: string, translationId: string) {
  // Poll up to ~20 minutes
  const maxAttempts = 80;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 15_000));
    const r = await fetch(`https://api.sync.so/v2/generate/${jobId}`, {
      headers: { "x-api-key": SYNC_SO_API_KEY! },
    });
    if (!r.ok) continue;
    const j = await r.json();
    const status = (j.status || "").toLowerCase();
    if (status === "completed" || status === "complete") {
      const outputUrl = j.outputUrl || j.output_url || j.url;
      if (outputUrl) {
        await admin
          .from("video_translations")
          .update({ lipsync_url: outputUrl, status: "completed", completed_at: new Date().toISOString() })
          .eq("id", translationId);
        return;
      }
    }
    if (status === "failed" || status === "error" || status === "rejected") {
      await admin
        .from("video_translations")
        .update({ status: "failed", error_message: `Sync.so job failed: ${j.error || status}` })
        .eq("id", translationId);
      return;
    }
  }
  await admin
    .from("video_translations")
    .update({ status: "failed", error_message: "Sync.so polling timed out" })
    .eq("id", translationId);
}

async function startLipsync(translationId: string) {
  const { data: tr, error } = await admin
    .from("video_translations")
    .select("*, videos(*)")
    .eq("id", translationId)
    .maybeSingle();
  if (error || !tr) throw new Error(`translation ${translationId} not found`);
  const video = (tr as any).videos;
  if (!video?.original_url) throw new Error("source video missing");
  if (!tr.output_url) throw new Error("dub audio missing — run dub mode first");

  await admin
    .from("video_translations")
    .update({ status: "processing", error_message: null })
    .eq("id", translationId);

  // Submit job to Sync.so
  const r = await fetch("https://api.sync.so/v2/generate", {
    method: "POST",
    headers: {
      "x-api-key": SYNC_SO_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "lipsync-2",
      input: [
        { type: "video", url: video.original_url },
        { type: "audio", url: tr.output_url },
      ],
      options: { sync_mode: "loop" },
    }),
  });

  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Sync.so submit failed [${r.status}]: ${err}`);
  }
  const job = await r.json();
  const jobId = job.id || job.job_id;
  if (!jobId) throw new Error("Sync.so did not return job id");

  await admin
    .from("video_translations")
    .update({ lipsync_job_id: jobId })
    .eq("id", translationId);

  // Poll in background
  EdgeRuntime.waitUntil(pollSyncJob(jobId, translationId));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!SYNC_SO_API_KEY) throw new Error("SYNC_SO_API_KEY not configured");
    const { translation_id } = await req.json();
    if (!translation_id) throw new Error("translation_id required");

    EdgeRuntime.waitUntil(
      startLipsync(translation_id).catch(async (e) => {
        console.error("startLipsync failed:", e);
        await admin
          .from("video_translations")
          .update({ status: "failed", error_message: e.message?.slice(0, 1000) || String(e) })
          .eq("id", translation_id);
      })
    );

    return new Response(JSON.stringify({ ok: true, translation_id }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

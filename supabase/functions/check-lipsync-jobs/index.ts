// Polls Sync.so for any video_translations stuck in 'processing' with a lipsync_job_id
// and updates the DB if the job is completed or failed. Call this from the client on
// VideoStudio page load to recover from edge runtime shutdowns mid-poll.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYNC_SO_API_KEY = Deno.env.get("SYNC_SO_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!SYNC_SO_API_KEY) throw new Error("SYNC_SO_API_KEY not configured");

    const { data: rows, error } = await admin
      .from("video_translations")
      .select("id, lipsync_job_id")
      .eq("mode", "lipsync")
      .eq("status", "processing")
      .not("lipsync_job_id", "is", null);

    if (error) throw error;

    const results: any[] = [];
    for (const row of rows || []) {
      try {
        const r = await fetch(`https://api.sync.so/v2/generate/${row.lipsync_job_id}`, {
          headers: { "x-api-key": SYNC_SO_API_KEY },
        });
        if (!r.ok) {
          results.push({ id: row.id, skipped: r.status });
          continue;
        }
        const j = await r.json();
        const status = (j.status || "").toLowerCase();
        if (status === "completed" || status === "complete") {
          const outputUrl = j.outputUrl || j.output_url || j.url;
          if (outputUrl) {
            await admin
              .from("video_translations")
              .update({
                lipsync_url: outputUrl,
                status: "completed",
                completed_at: new Date().toISOString(),
              })
              .eq("id", row.id);
            results.push({ id: row.id, updated: "completed" });
          }
        } else if (status === "failed" || status === "error" || status === "rejected") {
          await admin
            .from("video_translations")
            .update({
              status: "failed",
              error_message: `Sync.so job failed: ${j.error || status}`,
            })
            .eq("id", row.id);
          results.push({ id: row.id, updated: "failed" });
        } else {
          results.push({ id: row.id, status });
        }
      } catch (e: any) {
        results.push({ id: row.id, error: e.message });
      }
    }

    return new Response(JSON.stringify({ ok: true, checked: results.length, results }), {
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ONESIGNAL_APP_ID = "5b86f320-c33b-4c3d-8c00-d3f4b7d44c07";

async function sendOneSignalToAll(title: string, message: string, data: Record<string, unknown>) {
  const apiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
  if (!apiKey) {
    console.warn("[post-global-notification] ONESIGNAL_REST_API_KEY missing — skipping push");
    return { skipped: true };
  }
  try {
    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        included_segments: ["Subscribed Users"],
        headings: { en: title, tr: title },
        contents: { en: message, tr: message },
        data,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[post-global-notification] OneSignal error", res.status, json);
      return { ok: false, status: res.status, body: json };
    }
    return { ok: true, body: json };
  } catch (err) {
    console.error("[post-global-notification] OneSignal fetch failed", err);
    return { ok: false, error: String(err) };
  }
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const { title, description, remind_at, patient_id, type } = body ?? {};
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return new Response(JSON.stringify({ error: "title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Authorization: caller must NOT be 'staff' (i.e. must have a permitted role)
    const { data: canPost, error: rpcErr } = await admin.rpc(
      "can_post_global_notification",
      { _user_id: callerId },
    );
    if (rpcErr) throw rpcErr;
    if (!canPost) {
      return new Response(
        JSON.stringify({ error: "Forbidden: bu rolün genel hatırlatıcı ekleme yetkisi yok" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch all auth users
    const { data: { users }, error: usersErr } = await admin.auth.admin.listUsers();
    if (usersErr) throw usersErr;

    const rows = (users ?? []).map((u) => ({
      user_id: u.id,
      type: type ?? "reminder",
      title: title.trim(),
      description: description ?? null,
      patient_id: patient_id ?? null,
      remind_at: remind_at ?? null,
      read: false,
      scope: "global",
    }));

    if (rows.length === 0) {
      return new Response(JSON.stringify({ ok: true, inserted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insErr } = await admin.from("notifications").insert(rows);
    if (insErr) throw insErr;

    // Fan out a single OneSignal push to all subscribed users
    const pushResult = await sendOneSignalToAll(
      title.trim(),
      description ?? title.trim(),
      { scope: "global", type: type ?? "reminder", patient_id: patient_id ?? null },
    );

    return new Response(
      JSON.stringify({ ok: true, inserted: rows.length, push: pushResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("post-global-notification error", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

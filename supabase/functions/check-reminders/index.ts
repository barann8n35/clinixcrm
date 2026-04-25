import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date().toISOString();

    // Find patients with active reminders that are due
    const { data: duePatients, error: fetchErr } = await supabase
      .from("patients")
      .select("id, name, reminder_date, internal_notes")
      .eq("reminder_active", true)
      .not("reminder_date", "is", null)
      .lte("reminder_date", now);

    if (fetchErr) throw fetchErr;

    if (!duePatients || duePatients.length === 0) {
      return new Response(
        JSON.stringify({ message: "No due reminders", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all authenticated users to notify (all staff get notified)
    const { data: { users }, error: usersErr } = await supabase.auth.admin.listUsers();
    if (usersErr) throw usersErr;

    const userIds = (users || []).map((u) => u.id);

    let processed = 0;

    for (const patient of duePatients) {
      // Create notification for each user
      const notificationRows = userIds.map((userId) => ({
        user_id: userId,
        type: "reminder",
        title: `🔔 Hatırlatıcı: ${patient.name}`,
        description: patient.internal_notes || `${patient.name} için hatırlatıcı zamanı geldi.`,
        patient_id: patient.id,
        read: false,
      }));

      if (notificationRows.length > 0) {
        const { error: insertErr } = await supabase
          .from("notifications")
          .insert(notificationRows);
        if (insertErr) {
          console.error("Insert notification error:", insertErr);
          continue;
        }
      }

      // Reset the reminder on the patient
      await supabase
        .from("patients")
        .update({ reminder_active: false, reminder_date: null })
        .eq("id", patient.id);

      processed++;
    }

    return new Response(
      JSON.stringify({ message: "Reminders processed", processed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("check-reminders error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

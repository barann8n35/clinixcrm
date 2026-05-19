// Public webhook called by ElevenLabs Conversational AI as a Custom Tool.
// Reschedules an existing appointment for a patient identified by phone.
// No JWT verification: caller is ElevenLabs' server.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RescheduleBody {
  phone?: string;
  appointment_id?: string;
  new_date?: string; // "DD.MM.YYYY" or "YYYY-MM-DD"
  new_time?: string; // "HH:mm"
}

const TZ_OFFSET = "+03:00";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseDateTime(dateStr?: string, timeStr?: string): { iso: string; pretty: string } {
  if (!dateStr) throw new Error("new_date alanı zorunludur.");
  let y: number, m: number, day: number;
  const trMatch = dateStr.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (trMatch) {
    day = parseInt(trMatch[1], 10);
    m = parseInt(trMatch[2], 10);
    y = parseInt(trMatch[3], 10);
  } else if (isoMatch) {
    y = parseInt(isoMatch[1], 10);
    m = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);
  } else {
    throw new Error(`Geçersiz tarih formatı: ${dateStr}`);
  }
  const t = (timeStr ?? "10:00").match(/^(\d{1,2}):(\d{2})/);
  const hh = t ? parseInt(t[1], 10) : 10;
  const mm = t ? parseInt(t[2], 10) : 0;
  const isoLocal = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00${TZ_OFFSET}`;
  const d = new Date(isoLocal);
  if (isNaN(d.getTime())) throw new Error(`Geçersiz tarih/saat: ${dateStr} ${timeStr}`);
  const pretty = `${String(day).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y} ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  return { iso: d.toISOString(), pretty };
}

function prettyFromIso(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function normalizePhone(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("+")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("90")) return `+${digits}`;
  return `+90${digits.replace(/^0/, "")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json({ success: false, error: "Server not configured" }, 500);
    }

    const body: RescheduleBody = await req.json().catch(() => ({}));
    console.log("[voice-reschedule-appointment] body", JSON.stringify(body));

    let scheduled: { iso: string; pretty: string };
    try {
      scheduled = parseDateTime(body.new_date, body.new_time);
    } catch (e) {
      return json({ success: false, error: (e as Error).message }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Find appointment
    let appointment: { id: string; patient_id: string; scheduled_at: string; user_id: string } | null = null;

    if (body.appointment_id) {
      const { data } = await admin
        .from("appointments")
        .select("id, patient_id, scheduled_at, user_id")
        .eq("id", body.appointment_id)
        .maybeSingle();
      appointment = (data as any) ?? null;
    } else {
      const phone = normalizePhone(body.phone);
      if (!phone) {
        return json({ success: false, error: "phone veya appointment_id zorunludur." }, 400);
      }
      const { data: patient } = await admin
        .from("patients")
        .select("id")
        .eq("phone", phone)
        .limit(1)
        .maybeSingle();
      if (!patient?.id) {
        return json({ success: false, error: "Bu telefona kayıtlı hasta bulunamadı." });
      }
      const nowIso = new Date().toISOString();
      const { data } = await admin
        .from("appointments")
        .select("id, patient_id, scheduled_at, user_id")
        .eq("patient_id", patient.id)
        .in("status", ["upcoming", "rescheduled", "pending"])
        .gte("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      appointment = (data as any) ?? null;
    }

    if (!appointment) {
      return json({ success: false, error: "Güncellenecek aktif randevu bulunamadı." });
    }

    const oldPretty = prettyFromIso(appointment.scheduled_at);

    const { error: updErr } = await admin
      .from("appointments")
      .update({ scheduled_at: scheduled.iso, status: "rescheduled" })
      .eq("id", appointment.id);

    if (updErr) {
      console.error("[voice-reschedule-appointment] update error", updErr);
      const msg = updErr.message || "";
      if (msg.includes("Bu saat dolu") || (updErr as any).code === "P0001") {
        return json({ success: false, slot_taken: true, message: "Bu saat dolu. Lütfen başka bir saat önerin." });
      }
      return json({ success: false, error: `Randevu güncellenemedi: ${msg}` }, 500);
    }

    await admin
      .from("patients")
      .update({ status: "rescheduled", appointment_date: scheduled.iso, updated_at: new Date().toISOString() })
      .eq("id", appointment.patient_id);

    await admin.from("messages").insert({
      patient_id: appointment.patient_id,
      sender_type: "system",
      text: `Asistan tarafından randevu yeniden planlandı: ${oldPretty} → ${scheduled.pretty}`,
      platform: null,
      user_id: appointment.user_id,
    });

    return json({
      success: true,
      appointment_id: appointment.id,
      old_scheduled_at: oldPretty,
      new_scheduled_at: scheduled.pretty,
      message: `Randevu ${scheduled.pretty} olarak güncellendi.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[voice-reschedule-appointment] error", message);
    return json({ success: false, error: message }, 500);
  }
});

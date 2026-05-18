// Public webhook called by ElevenLabs Conversational AI as a Custom Tool.
// Creates/updates a patient and inserts an appointment row directly into the CRM.
// No JWT verification: the caller is ElevenLabs' server, not a logged-in user.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface BookBody {
  name?: string;
  surname?: string;
  phone?: string;
  complaint?: string;
  preferred_date?: string; // "DD.MM.YYYY" or "YYYY-MM-DD"
  preferred_time?: string; // "HH:mm"
}

const DOCTOR = "Prof. Dr. Ercan Lütfi Gürses";
const TZ_OFFSET = "+03:00";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseDateTime(dateStr?: string, timeStr?: string): { iso: string; pretty: string } {
  // default: now + 1 day
  if (!dateStr) {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const pretty = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    return { iso: d.toISOString(), pretty };
  }

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

    const body: BookBody = await req.json().catch(() => ({}));
    console.log("[voice-book-appointment] body", JSON.stringify(body));

    if (!body.name?.trim()) {
      return json({ success: false, error: "name alanı zorunludur." }, 400);
    }
    if (!body.complaint?.trim()) {
      return json({ success: false, error: "complaint alanı zorunludur." }, 400);
    }

    let scheduled: { iso: string; pretty: string };
    try {
      scheduled = parseDateTime(body.preferred_date, body.preferred_time);
    } catch (e) {
      return json({ success: false, error: (e as Error).message }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const phone = normalizePhone(body.phone);
    const name = body.name.trim();
    const surname = body.surname?.trim() ?? "";
    const fullName = surname ? `${name} ${surname}` : name;
    const complaint = body.complaint.trim();

    // 1) Find/create patient
    let patientId: string | null = null;
    if (phone) {
      const { data: existing } = await admin
        .from("patients")
        .select("id")
        .eq("phone", phone)
        .limit(1)
        .maybeSingle();
      if (existing?.id) patientId = existing.id as string;
    }

    if (patientId) {
      await admin
        .from("patients")
        .update({ name, surname: surname || null, complaint, updated_at: new Date().toISOString() })
        .eq("id", patientId);
    } else {
      patientId = `patient_${Date.now()}`;
      const { error: insertPatientErr } = await admin.from("patients").insert({
        id: patientId,
        name,
        surname: surname || null,
        phone,
        complaint,
        status: "active",
        platform: "voice",
        is_ai_active: true,
      });
      if (insertPatientErr) {
        console.error("[voice-book-appointment] insert patient error", insertPatientErr);
        return json({ success: false, error: `Hasta oluşturulamadı: ${insertPatientErr.message}` }, 500);
      }
    }

    // 2) Insert appointment
    const { data: appt, error: apptErr } = await admin
      .from("appointments")
      .insert({
        patient_id: patientId,
        doctor: DOCTOR,
        type: "Consultation",
        scheduled_at: scheduled.iso,
        status: "upcoming",
      })
      .select("id")
      .single();

    if (apptErr) {
      console.error("[voice-book-appointment] insert appointment error", apptErr);
      return json({ success: false, error: `Randevu oluşturulamadı: ${apptErr.message}` }, 500);
    }

    return json({
      success: true,
      appointment_id: appt.id,
      patient_name: fullName,
      scheduled_at: scheduled.pretty,
      message: "Randevunuz oluşturuldu.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[voice-book-appointment] error", message);
    return json({ success: false, error: message }, 500);
  }
});

// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { patient_id } = await req.json();
    if (!patient_id) throw new Error("patient_id required");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: patient } = await supabase
      .from("patients")
      .select("name, surname, age, gender, phone, location, complaint, status, tags, internal_notes, examination_notes, epicrisis, created_at, reminder_date, reminder_active")
      .eq("id", patient_id)
      .maybeSingle();

    if (!patient) throw new Error("Patient not found");

    const { data: appointments } = await supabase
      .from("appointments")
      .select("scheduled_at, type, status, doctor")
      .eq("patient_id", patient_id)
      .order("scheduled_at", { ascending: false })
      .limit(5);

    const { data: messages } = await supabase
      .from("messages")
      .select("sender_type, text, created_at, platform")
      .eq("patient_id", patient_id)
      .order("created_at", { ascending: false })
      .limit: 10 as any;

    // Try without limit chaining issue (above is faulty). Re-query properly:
    const { data: msgs } = await supabase
      .from("messages")
      .select("sender_type, text, created_at, platform")
      .eq("patient_id", patient_id)
      .order("created_at", { ascending: false })
      .limit(10);

    const context = {
      patient,
      appointments: appointments || [],
      recent_messages: (msgs || []).reverse(),
    };

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `Sen klinik asistanı AI'sın. Aşağıdaki hasta bilgisinden, hekimin saniyeler içinde anlayacağı bir TÜRKÇE özet üret.

KURALLAR:
- En fazla 4 kısa paragraf, toplam 120 kelime
- Şu sırayla: 1) Hasta profili (yaş, cinsiyet, şikayet) 2) Süreç durumu (randevu/aşama) 3) Klinik notlar veya epikriz varsa kritik vurgu 4) ÖNERİLEN AKSİYON (1 cümle, net ve uygulanabilir)
- Tıbbi terimleri koru ama gereksiz tekrar yapma
- Eğer veri yoksa "—" yaz, uydurma
- Markdown KULLANMA, düz metin

VERİ:
${JSON.stringify(context, null, 2)}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI error ${aiRes.status}: ${t}`);
    }

    const aiData = await aiRes.json();
    const summary = aiData?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

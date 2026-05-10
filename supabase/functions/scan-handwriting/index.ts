// Görselden el yazısı not çıkarımı (Lovable AI Vision — Gemini 2.5 Flash)
// ÇOKLU KAYIT desteği: tek defterden 10+ farklı hasta/randevu çıkarabilir.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Sen bir Türk klinik sekreterinin yardımcısısın. Sana el yazısı veya basılı not fotoğrafları verilir.
Bir defter sayfasında BİRDEN FAZLA hasta kaydı bulunabilir (10'a kadar). Her satır/blok ayrı bir hasta olabilir.

Görevin: Görüntüdeki TÜM kayıtları tek tek ayır ve "entries" dizisi olarak döndür. Her entry bir hasta kaydıdır.

Kurallar:
- Her satır farklı bir hasta olabilir — onları ayrı entry yap. Aynı hastaya ait birden fazla bilgi varsa tek entry'de birleştir.
- TR isim/soyisim, telefon numarası (10-11 haneli, başında 0/+90 olabilir), yaş, cinsiyet (E/K/Erkek/Kadın), şikayet
- Tarih kalıpları: "12.05.2026", "12/5", "yarın saat 14:30", "Pazartesi 10:00" — ISO 8601'e çevir (UTC+3)
- Hatırlatıcılar: "X tarihinde ara", "kontrol gönder" gibi maddeler
- Eğer alan görüntüde yoksa null/boş bırak — UYDURMA!
- Birden fazla sayfa varsa hepsindeki kayıtları aynı entries dizisine koy. source_image_index ile hangi görselden geldiğini belirt (0-tabanlı).
- HER entry için, defterden okunan TAM satırı "source_text" alanına AYNEN yaz (düzeltme yapma, ham haliyle). Bu sayede sekreter orijinal yazıyla karşılaştırabilir.
- Her entry için güven düzeyi: yazı net+okunabilirse 'high', kısmen okunduysa 'medium', çok belirsizse 'low'.
- Genel raw_text alanına tüm sayfaların ham metnini koy.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { images } = await req.json() as { images: string[] };
    if (!Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: "images[] gerekli" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY yok");

    const userContent: any[] = [
      { type: "text", text: "Bu fotoğraf(lar)daki TÜM sekreter notlarını ayrı ayrı entries dizisi olarak çıkar. Her satır farklı hasta olabilir." },
      ...images.map((url) => ({ type: "image_url", image_url: { url } })),
    ];

    const entrySchema = {
      type: "object",
      properties: {
        patient: {
          type: "object",
          properties: {
            name: { type: "string" },
            surname: { type: "string" },
            phone: { type: "string" },
            age: { type: "string" },
            gender: { type: "string" },
            complaint: { type: "string" },
          },
        },
        appointment: {
          type: "object",
          properties: {
            date_iso: { type: "string", description: "ISO 8601 datetime, ör: 2026-05-12T14:30:00+03:00" },
            doctor: { type: "string" },
            type: { type: "string" },
          },
        },
        reminders: {
          type: "array",
          items: {
            type: "object",
            properties: {
              remind_at_iso: { type: "string" },
              note: { type: "string" },
            },
            required: ["note"],
          },
        },
        notes: { type: "string", description: "Bu hastaya ait serbest klinik not" },
        source_text: { type: "string", description: "Bu kayda karşılık gelen, defterden okunan TAM satır(lar). Verbatim — düzeltme yapma." },
        source_image_index: { type: "number", description: "Bu kaydın hangi görselden çıktığı (0-tabanlı). Tek görsel varsa 0." },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["source_text"],
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_secretary_notes",
            description: "Sekreter defterinden TÜM hasta kayıtlarını entries dizisi olarak çıkar.",
            parameters: {
              type: "object",
              properties: {
                entries: {
                  type: "array",
                  description: "Her satır/blok için bir entry. Tek bir hastaya ait tüm bilgiler aynı entry'de.",
                  items: entrySchema,
                },
                raw_text: { type: "string", description: "Tüm sayfalardan okunan ham metin" },
              },
              required: ["entries", "raw_text"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_secretary_notes" } },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway hata:", resp.status, t);
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Çok fazla istek, lütfen biraz sonra tekrar deneyin." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI kredisi yetersiz. Lütfen workspace'inize kredi ekleyin." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI servisinde hata" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call ? JSON.parse(call.function.arguments) : { entries: [], raw_text: "" };
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Bilinmeyen hata" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

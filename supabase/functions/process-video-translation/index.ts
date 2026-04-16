// Orchestrates video translation: transcribe → translate → (subtitle SRT) or (TTS dub)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Map language codes -> ElevenLabs supported languages (eleven_multilingual_v2 covers 29 langs)
const LANG_NAMES: Record<string, string> = {
  ar: "Arabic",
  en: "English",
  ru: "Russian",
  de: "German",
  fr: "French",
  fa: "Persian (Farsi)",
  es: "Spanish",
  tr: "Turkish",
  it: "Italian",
  pt: "Portuguese",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  uk: "Ukrainian",
  ro: "Romanian",
  bg: "Bulgarian",
  pl: "Polish",
  nl: "Dutch",
};

async function callLovableAI(messages: any[], tools?: any[]) {
  const body: any = {
    model: "google/gemini-2.5-flash",
    messages,
  };
  if (tools) {
    body.tools = tools;
    body.tool_choice = { type: "function", function: { name: tools[0].function.name } };
  }
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Lovable AI error ${r.status}: ${t}`);
  }
  return r.json();
}

async function transcribeAudio(audioUrl: string, sourceLang: string): Promise<string> {
  // Fetch the file and pass as base64 data URL to gemini multimodal
  const audioResp = await fetch(audioUrl);
  if (!audioResp.ok) throw new Error(`Failed to fetch source media: ${audioResp.status}`);
  const arrayBuf = await audioResp.arrayBuffer();
  const bytes = new Uint8Array(arrayBuf);
  // chunked base64 to avoid stack overflow
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)) as any);
  }
  const base64 = btoa(binary);
  const mime = audioResp.headers.get("content-type") || "video/mp4";

  const result = await callLovableAI([
    {
      role: "system",
      content:
        "You are a precise medical transcription assistant. Transcribe audio verbatim, preserving medical terminology. Return only the transcript text, no commentary.",
    },
    {
      role: "user",
      content: [
        { type: "text", text: `Transcribe this ${LANG_NAMES[sourceLang] || sourceLang} medical/clinic video audio.` },
        { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
      ],
    },
  ]);
  return result.choices?.[0]?.message?.content?.trim() || "";
}

async function translateText(transcript: string, sourceLang: string, targetLang: string) {
  const tools = [
    {
      type: "function",
      function: {
        name: "return_translation",
        description: "Return the medical translation with timed segments for SRT subtitles.",
        parameters: {
          type: "object",
          properties: {
            translated_text: { type: "string", description: "Full translated text in target language." },
            segments: {
              type: "array",
              description: "Approx 5-10 second segments with start/end timecodes (MM:SS).",
              items: {
                type: "object",
                properties: {
                  start: { type: "string" },
                  end: { type: "string" },
                  text: { type: "string" },
                },
                required: ["start", "end", "text"],
              },
            },
          },
          required: ["translated_text", "segments"],
        },
      },
    },
  ];

  const result = await callLovableAI(
    [
      {
        role: "system",
        content: `You are a professional medical translator specializing in health tourism. Translate from ${LANG_NAMES[sourceLang] || sourceLang} to ${LANG_NAMES[targetLang] || targetLang} with accurate medical terminology. Split into ~5-10s subtitle segments.`,
      },
      { role: "user", content: transcript },
    ],
    tools
  );

  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  const args = JSON.parse(toolCall.function.arguments);
  return args as { translated_text: string; segments: { start: string; end: string; text: string }[] };
}

function buildSRT(segments: { start: string; end: string; text: string }[]): string {
  const toSrtTime = (mmss: string) => {
    const [m, s] = mmss.split(":").map(Number);
    const totalSec = (m || 0) * 60 + (s || 0);
    const hh = String(Math.floor(totalSec / 3600)).padStart(2, "0");
    const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
    const ss = String(totalSec % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss},000`;
  };
  return segments
    .map((seg, i) => `${i + 1}\n${toSrtTime(seg.start)} --> ${toSrtTime(seg.end)}\n${seg.text}\n`)
    .join("\n");
}

async function generateDubbedAudio(text: string): Promise<Uint8Array> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY not configured — required for dub mode");
  }
  // George voice (multilingual)
  const voiceId = "JBFqnCBsd6RMkjVDRZzb";
  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    }
  );
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`ElevenLabs TTS failed [${r.status}]: ${err}`);
  }
  return new Uint8Array(await r.arrayBuffer());
}

async function processTranslation(translationId: string) {
  // Load translation + video
  const { data: tr, error: tErr } = await admin
    .from("video_translations")
    .select("*, videos(*)")
    .eq("id", translationId)
    .maybeSingle();
  if (tErr || !tr) throw new Error(`Translation not found: ${translationId}`);

  const video = (tr as any).videos;
  if (!video) throw new Error("Source video missing");

  await admin
    .from("video_translations")
    .update({ status: "processing", error_message: null })
    .eq("id", translationId);

  try {
    // Step 1: transcribe
    let transcript = tr.transcript_text;
    if (!transcript) {
      transcript = await transcribeAudio(video.original_url, video.source_language);
      await admin.from("video_translations").update({ transcript_text: transcript }).eq("id", translationId);
    }

    // Step 2: translate
    const { translated_text, segments } = await translateText(
      transcript,
      video.source_language,
      tr.target_language
    );
    await admin
      .from("video_translations")
      .update({ translated_text })
      .eq("id", translationId);

    const updates: any = { translated_text };

    // Step 3: subtitle SRT
    const srt = buildSRT(segments);
    const srtPath = `${video.user_id}/subtitles/${translationId}_${tr.target_language}.srt`;
    const { error: srtErr } = await admin.storage
      .from("clinic-videos")
      .upload(srtPath, new Blob([srt], { type: "application/x-subrip" }), { upsert: true });
    if (srtErr) throw new Error(`SRT upload: ${srtErr.message}`);
    const { data: srtUrl } = await admin.storage.from("clinic-videos").createSignedUrl(srtPath, 60 * 60 * 24 * 365);
    updates.subtitle_url = srtUrl?.signedUrl;

    // Step 4: dub mode -> generate audio file
    if (tr.mode === "dub") {
      const mp3 = await generateDubbedAudio(translated_text);
      const audioPath = `${video.user_id}/dubs/${translationId}_${tr.target_language}.mp3`;
      const { error: aErr } = await admin.storage
        .from("clinic-videos")
        .upload(audioPath, mp3, { contentType: "audio/mpeg", upsert: true });
      if (aErr) throw new Error(`Audio upload: ${aErr.message}`);
      const { data: aUrl } = await admin.storage
        .from("clinic-videos")
        .createSignedUrl(audioPath, 60 * 60 * 24 * 365);
      updates.output_url = aUrl?.signedUrl;
    } else {
      // For subtitle mode, output = original video + SRT sidecar
      updates.output_url = video.original_url;
    }

    updates.status = "completed";
    updates.completed_at = new Date().toISOString();
    await admin.from("video_translations").update(updates).eq("id", translationId);
    return { ok: true, translationId };
  } catch (e: any) {
    console.error("Translation failed:", e);
    await admin
      .from("video_translations")
      .update({ status: "failed", error_message: e.message?.slice(0, 1000) || String(e) })
      .eq("id", translationId);
    throw e;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { translation_id } = await req.json();
    if (!translation_id) {
      return new Response(JSON.stringify({ error: "translation_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Run async (don't await): respond immediately so client can listen via realtime
    EdgeRuntime.waitUntil(processTranslation(translation_id).catch((e) => console.error(e)));

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

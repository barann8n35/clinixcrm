// Client-side video processing using @ffmpeg/ffmpeg (wasm).
// - burnSubtitlesToVideo: hardcodes SRT into video (high quality, CRF 18)
// - muxAudioToVideo: replaces audio track with dubbed audio (no re-encode of video)
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

type CoreSource = {
  coreURL: string;
  wasmURL: string;
  cors: "same-origin" | "cross-origin";
};

const CORE_SOURCES: CoreSource[] = [
  {
    coreURL: "/ffmpeg/ffmpeg-core.js",
    wasmURL: "/ffmpeg/ffmpeg-core.wasm",
    cors: "same-origin",
  },
  {
    coreURL: "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js",
    wasmURL: "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.wasm",
    cors: "cross-origin",
  },
  {
    coreURL: "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js",
    wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.wasm",
    cors: "cross-origin",
  },
];

async function loadCore(source: CoreSource, ff: FFmpeg) {
  const [coreURL, wasmURL] = source.cors === "same-origin"
    ? [source.coreURL, source.wasmURL]
    : await Promise.all([
        toBlobURL(source.coreURL, "text/javascript"),
        toBlobURL(source.wasmURL, "application/wasm"),
      ]);

  await ff.load({ coreURL, wasmURL });
}

async function getFFmpeg(onLog?: (m: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const ff = new FFmpeg();
    ff.on("log", ({ message }) => {
      if (onLog) onLog(message);
      // Always log to console for debugging
      console.log("[ffmpeg]", message);
    });
    let lastErr: unknown = null;
    for (const source of CORE_SOURCES) {
      try {
        await loadCore(source, ff);
        ffmpegInstance = ff;
        return ff;
      } catch (e) {
        lastErr = e;
        console.warn(`[ffmpeg] failed to load core from ${source.coreURL}:`, e);
      }
    }
    loadPromise = null;
    throw new Error(
      `FFmpeg motoru yüklenemedi. Detay: ${(lastErr as Error)?.message || lastErr}`
    );
  })();
  return loadPromise;
}

export interface BurnProgress {
  stage: "loading" | "downloading" | "encoding" | "done";
  ratio?: number;
  message?: string;
}

// Strip UTF-8 BOM and normalize line endings — ffmpeg's libass is picky.
async function fetchAndCleanSrt(srtUrl: string): Promise<Uint8Array> {
  const res = await fetch(srtUrl);
  if (!res.ok) throw new Error(`SRT indirilemedi: ${res.status}`);
  let text = await res.text();
  // Remove BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  // Normalize CRLF/CR -> LF
  text = text.replace(/\r\n?/g, "\n").trim() + "\n";
  return new TextEncoder().encode(text);
}

/**
 * Burns SRT subtitle into the video. High quality (CRF 18), audio re-encoded to AAC.
 */
export async function burnSubtitlesToVideo(
  videoUrl: string,
  srtUrl: string,
  onProgress?: (p: BurnProgress) => void
): Promise<Blob> {
  onProgress?.({ stage: "loading", message: "FFmpeg yükleniyor..." });
  const ff = await getFFmpeg();

  onProgress?.({ stage: "downloading", message: "Video & altyazı indiriliyor..." });
  const [videoData, srtData] = await Promise.all([
    fetchFile(videoUrl),
    fetchAndCleanSrt(srtUrl),
  ]);

  await ff.writeFile("input.mp4", videoData);
  await ff.writeFile("subs.srt", srtData);

  onProgress?.({ stage: "encoding", message: "Altyazı videoya gömülüyor (yüksek kalite)..." });

  const progressHandler = ({ progress }: { progress: number }) => {
    onProgress?.({ stage: "encoding", ratio: Math.min(Math.max(progress, 0), 1) });
  };
  ff.on("progress", progressHandler);

  // Use ASS-style subtitle filter with explicit styling. Single quotes are critical.
  // FontName=sans uses the default fontconfig fallback bundled with ffmpeg-core.
  const filter = `subtitles=subs.srt:force_style='Fontname=sans,Fontsize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&H80000000,BorderStyle=1,Outline=2,Shadow=1,MarginV=30,Alignment=2'`;

  try {
    await ff.exec([
      "-i", "input.mp4",
      "-vf", filter,
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "18",            // visually lossless
      "-pix_fmt", "yuv420p",   // broad compatibility
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "+faststart",
      "output.mp4",
    ]);
  } finally {
    ff.off("progress", progressHandler);
  }

  const data = await ff.readFile("output.mp4");
  try {
    await ff.deleteFile("input.mp4");
    await ff.deleteFile("subs.srt");
    await ff.deleteFile("output.mp4");
  } catch { /* ignore */ }

  onProgress?.({ stage: "done" });
  const u8 = data as Uint8Array;
  const ab = new ArrayBuffer(u8.byteLength);
  new Uint8Array(ab).set(u8);
  return new Blob([ab], { type: "video/mp4" });
}

/**
 * Replaces the audio track of a video with a new audio file (e.g. TTS dub).
 * Video stream is copied (no quality loss, fast). Audio re-encoded to AAC.
 * If the dub is shorter/longer than the video, output matches the shorter stream.
 */
export async function muxAudioToVideo(
  videoUrl: string,
  audioUrl: string,
  onProgress?: (p: BurnProgress) => void
): Promise<Blob> {
  onProgress?.({ stage: "loading", message: "FFmpeg yükleniyor..." });
  const ff = await getFFmpeg();

  onProgress?.({ stage: "downloading", message: "Video & ses indiriliyor..." });
  const [videoData, audioData] = await Promise.all([
    fetchFile(videoUrl),
    fetchFile(audioUrl),
  ]);

  await ff.writeFile("input.mp4", videoData);
  await ff.writeFile("dub.mp3", audioData);

  onProgress?.({ stage: "encoding", message: "Dublaj videoya birleştiriliyor..." });

  const progressHandler = ({ progress }: { progress: number }) => {
    onProgress?.({ stage: "encoding", ratio: Math.min(Math.max(progress, 0), 1) });
  };
  ff.on("progress", progressHandler);

  try {
    // -map 0:v copies video, -map 1:a uses new audio. -c:v copy = no quality loss.
    await ff.exec([
      "-i", "input.mp4",
      "-i", "dub.mp3",
      "-map", "0:v:0",
      "-map", "1:a:0",
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      "-movflags", "+faststart",
      "output.mp4",
    ]);
  } finally {
    ff.off("progress", progressHandler);
  }

  const data = await ff.readFile("output.mp4");
  try {
    await ff.deleteFile("input.mp4");
    await ff.deleteFile("dub.mp3");
    await ff.deleteFile("output.mp4");
  } catch { /* ignore */ }

  onProgress?.({ stage: "done" });
  const u8 = data as Uint8Array;
  const ab = new ArrayBuffer(u8.byteLength);
  new Uint8Array(ab).set(u8);
  return new Blob([ab], { type: "video/mp4" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

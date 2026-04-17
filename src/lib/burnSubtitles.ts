// Client-side subtitle burn-in using @ffmpeg/ffmpeg (wasm).
// Vite + module workers require the ESM ffmpeg core. Prefer same-origin assets
// under /public/ffmpeg and only fall back to CDN blobs if local files are unavailable.
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
    if (onLog) ff.on("log", ({ message }) => onLog(message));
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
      `FFmpeg motoru yüklenemedi. Tarayıcı bu cihazda ffmpeg çekirdeğini başlatamadı. Detay: ${(lastErr as Error)?.message || lastErr}`
    );
  })();
  return loadPromise;
}

export interface BurnProgress {
  stage: "loading" | "downloading" | "encoding" | "done";
  ratio?: number;
  message?: string;
}

/**
 * Burns the SRT subtitle into the video and returns a Blob (MP4).
 * Uses libx264 + AAC re-encode (required for hardcoded subtitles).
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
    fetchFile(srtUrl),
  ]);

  await ff.writeFile("input.mp4", videoData);
  await ff.writeFile("subs.srt", srtData);

  onProgress?.({ stage: "encoding", message: "Altyazı videoya gömülüyor (re-encode)..." });

  const progressHandler = ({ progress }: { progress: number }) => {
    onProgress?.({ stage: "encoding", ratio: progress });
  };
  ff.on("progress", progressHandler);

  // Hardcode subtitles. Force_style for readability over any background.
  const filter = "subtitles=subs.srt:force_style='FontName=Arial,FontSize=20,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,BorderStyle=1,Outline=2,Shadow=1,MarginV=24'";
  await ff.exec([
    "-i", "input.mp4",
    "-vf", filter,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    "output.mp4",
  ]);

  ff.off("progress", progressHandler);

  const data = await ff.readFile("output.mp4");
  // Cleanup virtual fs
  try {
    await ff.deleteFile("input.mp4");
    await ff.deleteFile("subs.srt");
    await ff.deleteFile("output.mp4");
  } catch {
    // ignore cleanup errors
  }

  onProgress?.({ stage: "done" });
  const u8 = data as Uint8Array;
  // Copy into a fresh ArrayBuffer to satisfy strict BlobPart typing across TS lib targets.
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

// Client-side subtitle burn-in using @ffmpeg/ffmpeg (wasm).
// Loads ffmpeg-core lazily from a CDN and burns an SRT file onto an MP4.
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

async function getFFmpeg(onLog?: (m: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const ff = new FFmpeg();
    if (onLog) ff.on("log", ({ message }) => onLog(message));
    await ff.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegInstance = ff;
    return ff;
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

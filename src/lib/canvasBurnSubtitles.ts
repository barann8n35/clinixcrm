// Canvas-based subtitle burning. No FFmpeg required.
// Plays the video in a hidden <video>, draws each frame to a canvas with
// subtitles overlaid, and records the canvas + original audio via MediaRecorder.
// Output is WebM (works on all modern browsers, plays in WhatsApp/iOS/Android).

export interface BurnProgress {
  stage: "loading" | "downloading" | "encoding" | "done";
  ratio?: number;
  message?: string;
}

interface SrtCue {
  start: number; // seconds
  end: number;
  text: string;
}

function parseSrtTime(s: string): number {
  // "00:01:23,456" → 83.456
  const m = s.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (!m) return 0;
  return (
    parseInt(m[1]) * 3600 +
    parseInt(m[2]) * 60 +
    parseInt(m[3]) +
    parseInt(m[4]) / 1000
  );
}

function parseSrt(text: string): SrtCue[] {
  let t = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  const blocks = t.split(/\n\n+/);
  const cues: SrtCue[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").filter(Boolean);
    if (lines.length < 2) continue;
    const timingLine = lines.find((l) => l.includes("-->"));
    if (!timingLine) continue;
    const [a, b] = timingLine.split("-->").map((s) => s.trim());
    const start = parseSrtTime(a);
    const end = parseSrtTime(b);
    const idx = lines.indexOf(timingLine);
    const text = lines.slice(idx + 1).join("\n").trim();
    if (text) cues.push({ start, end, text });
  }
  return cues;
}

function findActiveCue(cues: SrtCue[], t: number): SrtCue | null {
  for (const c of cues) {
    if (t >= c.start && t <= c.end) return c;
  }
  return null;
}

// Wrap text into multiple lines based on canvas width
function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split("\n");
  const lines: string[] = [];
  for (const p of paragraphs) {
    const words = p.split(/\s+/);
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function drawSubtitle(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number
) {
  // Font size scales with video height (~4.5% of height)
  const fontSize = Math.max(18, Math.round(height * 0.045));
  const padding = Math.round(fontSize * 0.4);
  const lineGap = Math.round(fontSize * 0.25);
  const marginBottom = Math.round(height * 0.06);
  const maxTextWidth = width * 0.85;

  ctx.font = `700 ${fontSize}px 'Inter', system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  const lines = wrapLines(ctx, text, maxTextWidth);
  if (lines.length === 0) return;

  const lineHeight = fontSize + lineGap;
  const blockHeight = lines.length * lineHeight + padding * 2;
  const blockY = height - marginBottom - blockHeight;
  const blockX = width / 2;

  // Background box
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const boxWidth = widest + padding * 2.5;
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.beginPath();
  const r = 8;
  const x = blockX - boxWidth / 2;
  const y = blockY;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + boxWidth - r, y);
  ctx.quadraticCurveTo(x + boxWidth, y, x + boxWidth, y + r);
  ctx.lineTo(x + boxWidth, y + blockHeight - r);
  ctx.quadraticCurveTo(x + boxWidth, y + blockHeight, x + boxWidth - r, y + blockHeight);
  ctx.lineTo(x + r, y + blockHeight);
  ctx.quadraticCurveTo(x, y + blockHeight, x, y + blockHeight - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.fill();

  // Text with subtle stroke
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.lineWidth = Math.max(2, fontSize * 0.1);
  ctx.fillStyle = "#ffffff";

  let textY = blockY + padding + lineHeight / 2;
  for (const line of lines) {
    ctx.strokeText(line, blockX, textY);
    ctx.fillText(line, blockX, textY);
    textY += lineHeight;
  }
}

function pickMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return "video/webm";
}

export async function burnSubtitlesToVideoCanvas(
  videoUrl: string,
  srtUrl: string,
  onProgress?: (p: BurnProgress) => void
): Promise<Blob> {
  onProgress?.({ stage: "downloading", message: "Video & altyazı hazırlanıyor..." });

  // Fetch SRT
  const srtRes = await fetch(srtUrl);
  if (!srtRes.ok) throw new Error(`SRT indirilemedi: ${srtRes.status}`);
  const srtText = await srtRes.text();
  const cues = parseSrt(srtText);
  if (cues.length === 0) throw new Error("SRT boş veya geçersiz");

  // Fetch video as blob (avoids CORS taint when drawing to canvas)
  const vidRes = await fetch(videoUrl);
  if (!vidRes.ok) throw new Error(`Video indirilemedi: ${vidRes.status}`);
  const vidBlob = await vidRes.blob();
  const vidObjUrl = URL.createObjectURL(vidBlob);

  const video = document.createElement("video");
  video.src = vidObjUrl;
  video.crossOrigin = "anonymous";
  video.muted = false;
  video.playsInline = true;
  video.preload = "auto";

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Video yüklenemedi"));
  });

  const width = video.videoWidth;
  const height = video.videoHeight;
  const duration = video.duration;
  if (!width || !height || !isFinite(duration)) {
    throw new Error("Video boyutları okunamadı");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context alınamadı");

  // Capture audio from video element
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaElementSource(video);
  const dest = audioCtx.createMediaStreamDestination();
  source.connect(dest);
  // Don't connect to speakers (silent processing)

  // Combine canvas video + audio into one stream
  const canvasStream = canvas.captureStream(30);
  const combined = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(combined, {
    mimeType,
    videoBitsPerSecond: Math.min(8_000_000, width * height * 4), // high quality
    audioBitsPerSecond: 192_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const out = new Blob(chunks, { type: mimeType });
      if (out.size === 0) reject(new Error("Encoding boş çıktı verdi"));
      else resolve(out);
    };
    recorder.onerror = (e: any) => reject(new Error("Recorder hatası: " + (e?.error?.message || "unknown")));
  });

  onProgress?.({ stage: "encoding", message: "Altyazı videoya gömülüyor (gerçek zamanlı)...", ratio: 0 });

  recorder.start(250);

  // Render loop driven by requestAnimationFrame, synced to video.currentTime
  let stopped = false;
  let lastReportedRatio = 0;

  const render = () => {
    if (stopped) return;
    try {
      ctx.drawImage(video, 0, 0, width, height);
      const cue = findActiveCue(cues, video.currentTime);
      if (cue) drawSubtitle(ctx, cue.text, width, height);
    } catch (e) {
      // ignore single-frame errors (e.g. first frame before ready)
    }
    const ratio = duration > 0 ? Math.min(1, video.currentTime / duration) : 0;
    if (ratio - lastReportedRatio > 0.01) {
      lastReportedRatio = ratio;
      onProgress?.({ stage: "encoding", ratio });
    }
    requestAnimationFrame(render);
  };

  video.onended = () => {
    stopped = true;
    setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, 200);
  };

  await video.play();
  render();

  const blob = await finished;
  URL.revokeObjectURL(vidObjUrl);
  try {
    audioCtx.close();
  } catch {}
  onProgress?.({ stage: "done" });
  return blob;
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

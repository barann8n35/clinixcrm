import { useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  onTranscript: (text: string) => void;
  className?: string;
}

export function VoiceDictateButton({ onTranscript, className }: Props) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = handleStop;
      rec.start();
      recRef.current = rec;
      setRecording(true);
    } catch {
      toast.error("Mikrofona erişilemedi");
    }
  }

  async function handleStop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    setProcessing(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "dictation.webm");
      fd.append("language", "tur");
      const { data, error } = await supabase.functions.invoke("transcribe-audio", { body: fd });
      if (error) throw error;
      const text = (data as any)?.text?.trim();
      if (text) {
        onTranscript(text);
        toast.success("Ses metne çevrildi 🎙️");
      } else {
        toast.error("Ses algılanamadı");
      }
    } catch (e: any) {
      toast.error(e?.message || "Çeviri başarısız");
    } finally {
      setProcessing(false);
    }
  }

  function stop() {
    recRef.current?.stop();
    recRef.current = null;
    setRecording(false);
  }

  const busy = processing;

  return (
    <Button
      type="button"
      size="sm"
      variant={recording ? "default" : "outline"}
      onClick={recording ? stop : start}
      disabled={busy}
      className={cn(
        "h-7 px-2.5 text-[11px] rounded-lg gap-1.5 transition-all hover:scale-105 active:scale-95",
        recording && "bg-red-500 hover:bg-red-500/90 text-white border-red-500 animate-pulse",
        className,
      )}
    >
      {busy ? (
        <><Loader2 className="w-3 h-3 animate-spin" /> Çevriliyor...</>
      ) : recording ? (
        <><Square className="w-3 h-3 fill-current" /> Durdur</>
      ) : (
        <><Mic className="w-3 h-3" /> Sesli Yaz</>
      )}
    </Button>
  );
}

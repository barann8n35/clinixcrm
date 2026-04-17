import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Send, Video as VideoIcon, Languages, Subtitles, Mic, Loader2, Film } from "lucide-react";
import { toast } from "sonner";
import { burnSubtitlesToVideoCanvas } from "@/lib/canvasBurnSubtitles";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  patientId: string;
  patientName: string;
}

interface CompletedTranslation {
  id: string;
  video_id: string;
  target_language: string;
  target_language_label: string;
  mode: "subtitle" | "dub" | "clone_dub" | "lipsync";
  output_url: string | null;
  subtitle_url: string | null;
  lipsync_url: string | null;
  videos: { title: string; original_url: string; user_id: string };
}

export function SendVideoDialog({ open, onOpenChange, patientId, patientName }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<CompletedTranslation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [burnProgress, setBurnProgress] = useState<number>(0);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("video_translations")
        .select("id, video_id, target_language, target_language_label, mode, output_url, subtitle_url, lipsync_url, videos!inner(title, user_id, original_url)")
        .eq("status", "completed")
        .eq("videos.user_id", user.id)
        .order("created_at", { ascending: false });
      setItems((data as any[]) || []);
      setLoading(false);
    })();
  }, [open, user]);

  // Resolves a sendable video URL for a translation. For subtitle mode,
  // burns subtitles into the original video (browser-side) and uploads to storage.
  const resolveSendableUrl = async (t: CompletedTranslation): Promise<string> => {
    if (t.mode === "lipsync" && t.lipsync_url) return t.lipsync_url;
    if ((t.mode === "dub" || t.mode === "clone_dub") && t.output_url) return t.output_url;
    if (t.mode === "subtitle") {
      if (!t.subtitle_url) throw new Error("Altyazı dosyası yok");
      // Burn-in once, cache to storage at burned/<translationId>.webm
      const path = `${t.videos.user_id}/burned/${t.id}.webm`;
      const { data: existing } = await supabase.storage
        .from("clinic-videos")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (existing?.signedUrl) {
        try {
          const head = await fetch(existing.signedUrl, { method: "HEAD" });
          if (head.ok) return existing.signedUrl;
        } catch { /* regenerate */ }
      }
      const blob = await burnSubtitlesToVideoCanvas(t.videos.original_url, t.subtitle_url, (p) => {
        if (p.ratio !== undefined) setBurnProgress(Math.round(p.ratio * 100));
      });
      const { error: upErr } = await supabase.storage
        .from("clinic-videos")
        .upload(path, blob, { contentType: "video/webm", upsert: true });
      if (upErr) throw new Error("Yükleme: " + upErr.message);
      const { data: signed } = await supabase.storage
        .from("clinic-videos")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (!signed?.signedUrl) throw new Error("Link oluşturulamadı");
      return signed.signedUrl;
    }
    if (t.output_url) return t.output_url;
    throw new Error("Gönderilebilir bir çıktı yok");
  };

  const sendVideo = async (t: CompletedTranslation) => {
    setSending(t.id);
    setBurnProgress(0);
    const tId = t.mode === "subtitle"
      ? toast.loading("Altyazılı video hazırlanıyor (1-3 dk)...")
      : toast.loading("Gönderiliyor...");
    try {
      const url = await resolveSendableUrl(t);
      const text = `📹 ${t.videos.title} (${t.target_language_label})\n${url}`;
      const { error } = await supabase.from("messages").insert({
        patient_id: patientId,
        sender_type: "secretary",
        text,
        platform: null,
      });
      if (error) throw error;
      toast.success(`Video ${patientName} hastasına gönderildi`, { id: tId });
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Gönderilemedi: " + e.message, { id: tId });
    } finally {
      setSending(null);
      setBurnProgress(0);
    }
  };

  const modeLabel = (m: CompletedTranslation["mode"]) =>
    m === "lipsync" ? "Lip-Sync" : m === "clone_dub" ? "Klon Dublaj" : m === "dub" ? "Dublaj" : "Altyazı";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <VideoIcon className="w-5 h-5 text-primary" /> Hastaya Video Gönder
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          {sending && burnProgress > 0 && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                Altyazı videoya gömülüyor — sayfayı kapatmayın
              </div>
              <Progress value={burnProgress} />
            </div>
          )}
          {loading ? (
            [1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <VideoIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Henüz tamamlanmış çeviri yok.
              <br />
              <span className="text-xs">Video Stüdyo'dan video yükleyip çevirebilirsiniz.</span>
            </div>
          ) : (
            items.map(t => {
              const canSend =
                (t.mode === "subtitle" && !!t.subtitle_url) ||
                (t.mode === "lipsync" && !!t.lipsync_url) ||
                ((t.mode === "dub" || t.mode === "clone_dub") && !!t.output_url);
              return (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    {t.mode === "subtitle" ? <Film className="w-5 h-5 text-primary" /> : <VideoIcon className="w-5 h-5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{t.videos.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4 gap-0.5">
                        <Languages className="w-2 h-2" /> {t.target_language_label}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4 gap-0.5">
                        {t.mode === "subtitle" ? <Subtitles className="w-2 h-2" /> : <Mic className="w-2 h-2" />}
                        {modeLabel(t.mode)}
                      </Badge>
                    </div>
                  </div>
                  <Button size="sm" disabled={sending === t.id || !canSend} onClick={() => sendVideo(t)} className="rounded-lg gap-1.5">
                    {sending === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Gönder
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

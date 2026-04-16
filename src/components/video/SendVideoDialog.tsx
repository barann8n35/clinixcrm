import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Video as VideoIcon, Languages, Subtitles, Mic, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  mode: "subtitle" | "dub";
  output_url: string | null;
  subtitle_url: string | null;
  videos: { title: string };
}

export function SendVideoDialog({ open, onOpenChange, patientId, patientName }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<CompletedTranslation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("video_translations")
        .select("id, video_id, target_language, target_language_label, mode, output_url, subtitle_url, videos!inner(title, user_id)")
        .eq("status", "completed")
        .eq("videos.user_id", user.id)
        .order("created_at", { ascending: false });
      setItems((data as any[]) || []);
      setLoading(false);
    })();
  }, [open, user]);

  const sendVideo = async (t: CompletedTranslation) => {
    if (!t.output_url) return;
    setSending(t.id);
    try {
      const text = `📹 ${t.videos.title} (${t.target_language_label})\n${t.output_url}`;
      const { error } = await supabase.from("messages").insert({
        patient_id: patientId,
        sender_type: "secretary",
        text,
        platform: null,
      });
      if (error) throw error;
      toast.success(`Video ${patientName} hastasına gönderildi`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Gönderilemedi: " + e.message);
    } finally {
      setSending(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <VideoIcon className="w-5 h-5 text-primary" /> Hastaya Video Gönder
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 pt-2">
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
            items.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <VideoIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{t.videos.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4 gap-0.5">
                      <Languages className="w-2 h-2" /> {t.target_language_label}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4 gap-0.5">
                      {t.mode === "dub" ? <Mic className="w-2 h-2" /> : <Subtitles className="w-2 h-2" />}
                      {t.mode === "dub" ? "Dublaj" : "Altyazı"}
                    </Badge>
                  </div>
                </div>
                <Button size="sm" disabled={sending === t.id || !t.output_url} onClick={() => sendVideo(t)} className="rounded-lg gap-1.5">
                  {sending === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Gönder
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

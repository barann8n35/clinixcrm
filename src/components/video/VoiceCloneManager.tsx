import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, Upload, Loader2, Trash2, CheckCircle2, AlertCircle, Sparkles, Volume2, Square, RotateCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface VoiceClone {
  id: string;
  name: string;
  elevenlabs_voice_id: string | null;
  sample_url: string | null;
  status: "pending" | "ready" | "failed";
  error_message: string | null;
  created_at: string;
}

const VoiceCloneManager = () => {
  const { user } = useAuth();
  const { isPremiumPlus, loading: roleLoading } = useRole();
  const [clones, setClones] = useState<VoiceClone[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Recording
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [chunks, setChunks] = useState<Blob[]>([]);
  const [recDuration, setRecDuration] = useState(0);
  const recTimerRef = useRef<number | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("voice_clones")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setClones((data as VoiceClone[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase
      .channel("voice-clones-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_clones", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const submitSample = async (file: File | Blob, fileName = "voice_sample.webm") => {
    if (!user) return;
    if (!name.trim()) { toast.error("Lütfen ses için bir isim girin"); return; }
    if (file.size > 25 * 1024 * 1024) { toast.error("Örnek 25MB'dan büyük olamaz"); return; }
    setUploading(true);
    try {
      const ext = fileName.split(".").pop() || "webm";
      const path = `${user.id}/voice-samples/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("clinic-videos")
        .upload(path, file, { contentType: (file as any).type || "audio/webm" });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("clinic-videos").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (!signed?.signedUrl) throw new Error("URL imzalanamadı");

      const { data: ins, error: insErr } = await supabase
        .from("voice_clones")
        .insert({ user_id: user.id, name: name.trim(), sample_url: signed.signedUrl, status: "pending" })
        .select("id")
        .single();
      if (insErr) throw insErr;

      // Trigger ElevenLabs cloning
      await supabase.functions.invoke("clone-voice", { body: { clone_id: ins.id } });

      toast.success("Ses klonlama başlatıldı! Birkaç saniye içinde hazır olacak.");
      setName("");
      load();
    } catch (e: any) {
      toast.error("Hata: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const localChunks: Blob[] = [];
      mr.ondataavailable = (e) => { if (e.data.size) localChunks.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(localChunks, { type: "audio/webm" });
        if (blob.size < 50_000) {
          toast.error("Kayıt çok kısa. En az 30 saniye konuşun.");
          return;
        }
        submitSample(blob, "recording.webm");
      };
      mr.start();
      setRecorder(mr);
      setChunks([]);
      setRecording(true);
      setRecDuration(0);
      recTimerRef.current = window.setInterval(() => setRecDuration(d => d + 1), 1000);
    } catch (e: any) {
      toast.error("Mikrofon erişimi reddedildi: " + e.message);
    }
  };

  const stopRecording = () => {
    if (recorder && recording) {
      recorder.stop();
      setRecording(false);
      if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    }
  };

  const retryClone = async (id: string) => {
    try {
      await supabase.from("voice_clones").update({ status: "pending", error_message: null }).eq("id", id);
      const { error } = await supabase.functions.invoke("clone-voice", { body: { clone_id: id } });
      if (error) throw error;
      toast.success("Klonlama yeniden başlatıldı");
      load();
    } catch (e: any) {
      toast.error("Hata: " + e.message);
    }
  };

  const deleteClone = async (id: string) => {
    if (!confirm("Bu ses klonu silinecek. Emin misiniz?")) return;
    const { error } = await supabase.from("voice_clones").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Silindi");
    load();
  };

  if (roleLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  if (!isPremiumPlus) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center mx-auto mb-4 shadow-card">
          <Sparkles className="w-7 h-7 text-primary-foreground" />
        </div>
        <h3 className="text-lg font-display font-extrabold text-foreground mb-2">Ses Klonlama — Premium+ Özellik</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
          Kendi sesinizi klonlayın ve videolarınızı tüm dillerde <b>kendi sesinizle</b> dublajlayın.
          Bu özellik Premium+ üyelere özeldir.
        </p>
        <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
          <Sparkles className="w-3 h-3 mr-1.5" /> Premium+ gerekli
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card space-y-4">
        <div>
          <h3 className="text-sm font-display font-bold text-foreground mb-1 flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary" /> Yeni Ses Klonu Oluştur
          </h3>
          <p className="text-xs text-muted-foreground">
            En iyi sonuç için 1-3 dakikalık net, gürültüsüz konuşma örneği yükleyin veya kaydedin.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Ses Adı</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ör. Dr. Ayşe Yılmaz" className="rounded-lg" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            variant="outline"
            disabled={uploading || recording || !name.trim()}
            onClick={() => fileRef.current?.click()}
            className="rounded-xl gap-2 h-11 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Upload className="w-4 h-4" /> Ses Dosyası Yükle
          </Button>
          <input ref={fileRef} type="file" accept="audio/*" hidden
            onChange={(e) => e.target.files?.[0] && submitSample(e.target.files[0], e.target.files[0].name)} />

          {!recording ? (
            <Button onClick={startRecording} disabled={uploading || !name.trim()}
              className="rounded-xl gap-2 h-11 hover:scale-[1.02] active:scale-95 transition-all">
              <Mic className="w-4 h-4" /> Şimdi Kaydet
            </Button>
          ) : (
            <Button onClick={stopRecording} variant="destructive"
              className="rounded-xl gap-2 h-11 animate-pulse">
              <Square className="w-4 h-4" /> Durdur ({recDuration}s)
            </Button>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Mevcut Ses Klonlarınız</h3>
        {loading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : clones.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground bg-muted/30 rounded-xl">
            Henüz ses klonunuz yok.
          </div>
        ) : (
          <div className="space-y-2">
            {clones.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Volume2 className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("tr-TR")}
                  </p>
                </div>
                {c.status === "pending" && (
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px] gap-1"><Loader2 className="w-3 h-3 animate-spin" /> İşleniyor</Badge>
                    <Button size="sm" variant="ghost" onClick={() => retryClone(c.id)}
                      className="h-7 px-2 rounded-lg" title="Yeniden Dene">
                      <RotateCw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
                {c.status === "ready" && (
                  <Badge variant="outline" className="text-[10px] gap-1 border-success/30 text-success bg-success/5">
                    <CheckCircle2 className="w-3 h-3" /> Hazır
                  </Badge>
                )}
                {c.status === "failed" && (
                  <Badge variant="outline" className="text-[10px] gap-1 border-destructive/30 text-destructive bg-destructive/5" title={c.error_message || ""}>
                    <AlertCircle className="w-3 h-3" /> Başarısız
                  </Badge>
                )}
                {c.sample_url && (
                  <audio src={c.sample_url} controls className="h-8 max-w-[160px]" />
                )}
                <Button size="sm" variant="ghost" onClick={() => deleteClone(c.id)}
                  className="text-destructive hover:bg-destructive/10 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceCloneManager;

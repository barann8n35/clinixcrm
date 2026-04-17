import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video, Upload, Globe, Subtitles, Mic, Loader2, Download, Copy, Check,
  Trash2, Plus, X, Sparkles, AlertCircle, Play, FileAudio, Languages, Wand2, UserCircle, Film
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { burnSubtitlesToVideo, downloadBlob } from "@/lib/burnSubtitles";

interface Video { id: string; title: string; original_url: string; source_language: string; duration_seconds: number | null; file_size: number | null; status: string; created_at: string; }
type TranslationMode = "subtitle" | "dub" | "clone_dub" | "lipsync";
interface VideoTranslation { id: string; video_id: string; target_language: string; target_language_label: string; mode: TranslationMode; status: string; output_url: string | null; subtitle_url: string | null; lipsync_url: string | null; error_message: string | null; created_at: string; completed_at: string | null; voice_clone_id: string | null; }
interface VoiceClone { id: string; name: string; elevenlabs_voice_id: string | null; status: string; }

const PRESET_LANGS = [
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "fa", label: "فارسی", flag: "🇮🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

const PremiumGate = () => (
  <div className="min-h-full flex items-center justify-center p-8 gradient-mesh">
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="max-w-md text-center bg-card rounded-2xl p-8 border border-border shadow-elevated">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto mb-5 shadow-card">
        <Sparkles className="w-8 h-8 text-primary-foreground" />
      </div>
      <h1 className="text-2xl font-display font-extrabold text-foreground mb-2">Premium Özellik</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Video Stüdyo, sağlık turizmi yapan klinikler için özel olarak tasarlanmış premium bir özelliktir.
        Bu özelliğe erişmek için lütfen yöneticinizden <b>premium</b> rolü atamasını isteyin.
      </p>
      <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 px-3 py-1">
        <Sparkles className="w-3 h-3 mr-1.5" /> Sağlık Turizmi Premium
      </Badge>
    </motion.div>
  </div>
);

const VideoStudio = () => {
  const { user } = useAuth();
  const { isPremium, isPremiumPlus, loading: roleLoading } = useRole();
  const [videos, setVideos] = useState<Video[]>([]);
  const [translations, setTranslations] = useState<VideoTranslation[]>([]);
  const [voiceClones, setVoiceClones] = useState<VoiceClone[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showTranslateDialog, setShowTranslateDialog] = useState<Video | null>(null);
  const [selectedLangs, setSelectedLangs] = useState<{ code: string; label: string }[]>([]);
  const [customLang, setCustomLang] = useState({ code: "", label: "" });
  const [mode, setMode] = useState<TranslationMode>("subtitle");
  const [selectedVoiceCloneId, setSelectedVoiceCloneId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [burning, setBurning] = useState<string | null>(null); // translation id being burned
  const [burnProgress, setBurnProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    if (!user) return;
    const [{ data: vids }, { data: trs }, { data: vcs }] = await Promise.all([
      supabase.from("videos").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("video_translations").select("*, videos!inner(user_id)").eq("videos.user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("voice_clones").select("id, name, elevenlabs_voice_id, status").eq("user_id", user.id).eq("status", "ready"),
    ]);
    setVideos((vids as Video[]) || []);
    setTranslations((trs as any[]) || []);
    setVoiceClones((vcs as VoiceClone[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    loadData();
    const ch = supabase
      .channel("video-translations-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "video_translations" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "videos" }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const handleUpload = async (file: File) => {
    if (!user) return;
    if (file.size > 50 * 1024 * 1024) { toast.error("Dosya 50MB'dan büyük olamaz"); return; }
    if (!file.type.startsWith("video/")) { toast.error("Lütfen geçerli bir video dosyası seçin"); return; }

    setUploading(true);
    setUploadProgress(10);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${user.id}/originals/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      setUploadProgress(40);
      const { error: upErr } = await supabase.storage.from("clinic-videos").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      setUploadProgress(70);

      const { data: signed } = await supabase.storage.from("clinic-videos").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (!signed?.signedUrl) throw new Error("Sign URL failed");

      const { error: insErr } = await supabase.from("videos").insert({
        user_id: user.id,
        title: file.name.replace(/\.[^.]+$/, ""),
        original_url: signed.signedUrl,
        source_language: "tr",
        file_size: file.size,
        status: "ready",
      });
      if (insErr) throw insErr;

      setUploadProgress(100);
      toast.success("Video yüklendi! Şimdi çevirebilirsiniz.");
      loadData();
    } catch (e: any) {
      toast.error("Yükleme başarısız: " + e.message);
    } finally {
      setTimeout(() => { setUploading(false); setUploadProgress(0); }, 500);
    }
  };

  const toggleLang = (code: string, label: string) => {
    setSelectedLangs(prev => prev.find(l => l.code === code) ? prev.filter(l => l.code !== code) : [...prev, { code, label }]);
  };

  const addCustomLang = () => {
    if (!customLang.code.trim() || !customLang.label.trim()) { toast.error("Dil kodu ve adı gerekli"); return; }
    if (selectedLangs.find(l => l.code === customLang.code)) { toast.error("Bu dil zaten ekli"); return; }
    setSelectedLangs([...selectedLangs, { ...customLang }]);
    setCustomLang({ code: "", label: "" });
  };

  const startTranslation = async () => {
    if (!showTranslateDialog || selectedLangs.length === 0) { toast.error("En az bir hedef dil seçin"); return; }
    if ((mode === "clone_dub" || mode === "lipsync") && !selectedVoiceCloneId) {
      toast.error("Bu mod için bir ses klonu seçmelisiniz"); return;
    }
    setSubmitting(true);
    try {
      // Insert one row per language
      const rows = selectedLangs.map(l => ({
        video_id: showTranslateDialog.id,
        target_language: l.code,
        target_language_label: l.label,
        mode,
        status: "pending",
        voice_clone_id: (mode === "clone_dub" || mode === "lipsync") ? selectedVoiceCloneId : null,
      }));
      const { data: inserted, error } = await supabase.from("video_translations").insert(rows).select("id");
      if (error) throw error;

      // Trigger edge function for each translation (parallel)
      await Promise.all(
        (inserted || []).map(t =>
          supabase.functions.invoke("process-video-translation", { body: { translation_id: t.id } })
        )
      );

      toast.success(`${selectedLangs.length} dil için çeviri başlatıldı`);
      setShowTranslateDialog(null);
      setSelectedLangs([]);
      setSelectedVoiceCloneId("");
      loadData();
    } catch (e: any) {
      toast.error("Başlatılamadı: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteVideo = async (id: string) => {
    if (!confirm("Bu video ve tüm çevirileri silinecek. Emin misiniz?")) return;
    const { error } = await supabase.from("videos").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Video silindi");
    loadData();
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link kopyalandı");
  };

  const downloadBurnedVideo = async (t: VideoTranslation, videoUrl: string, videoTitle: string) => {
    if (!t.subtitle_url) { toast.error("Altyazı dosyası bulunamadı"); return; }
    setBurning(t.id);
    setBurnProgress(0);
    const tId = toast.loading("Altyazı videoya gömülüyor... (1-3 dk sürebilir)");
    try {
      const blob = await burnSubtitlesToVideo(videoUrl, t.subtitle_url, (p) => {
        if (p.ratio !== undefined) setBurnProgress(Math.round(p.ratio * 100));
      });
      const safeTitle = videoTitle.replace(/[^\w\-]+/g, "_").slice(0, 40);
      downloadBlob(blob, `${safeTitle}_${t.target_language}.mp4`);
      toast.success("Altyazılı MP4 indirildi", { id: tId });
    } catch (e: any) {
      console.error(e);
      toast.error("Altyazı gömme başarısız: " + (e.message || e), { id: tId });
    } finally {
      setBurning(null);
      setBurnProgress(0);
    }
  };

  if (roleLoading) {
    return <div className="p-8"><Skeleton className="h-64 w-full rounded-2xl" /></div>;
  }
  if (!isPremium) return <PremiumGate />;

  return (
    <div className="p-6 md:p-8 space-y-6 h-full overflow-auto gradient-mesh">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-display font-extrabold text-foreground tracking-tight">Video Stüdyo</h1>
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-[10px]">
              <Sparkles className="w-2.5 h-2.5 mr-1" /> Premium
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Klinik tanıtım videolarınızı otomatik olarak çoklu dile çevirin</p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}
          className="gap-2 rounded-xl shadow-card hover:shadow-elevated transition-all hover:scale-105 active:scale-95">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Yeni Video Yükle
        </Button>
        <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
      </motion.div>

      {uploading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl p-4 border border-border shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm font-semibold text-foreground">Video yükleniyor...</span>
          </div>
          <Progress value={uploadProgress} />
        </motion.div>
      )}

      {/* Empty state */}
      {!loading && videos.length === 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-2xl p-12 border-2 border-dashed border-border text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}>
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-display font-bold text-foreground mb-1">İlk videonuzu yükleyin</h3>
          <p className="text-sm text-muted-foreground mb-4">MP4, MOV, WebM • Maks 50MB • Önerilen: 5dk altı</p>
          <Button variant="outline" className="rounded-xl">
            <Upload className="w-4 h-4 mr-2" /> Video Seç
          </Button>
        </motion.div>
      )}

      {/* Videos grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((v, i) => {
            const vTrs = translations.filter(t => t.video_id === v.id);
            return (
              <motion.div key={v.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl border border-border shadow-card hover:shadow-elevated transition-all overflow-hidden flex flex-col">
                <div className="aspect-video bg-muted relative">
                  <video src={v.original_url} className="w-full h-full object-cover" controls preload="metadata" />
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-semibold text-foreground text-sm truncate mb-1">{v.title}</h3>
                  <p className="text-[11px] text-muted-foreground mb-3">
                    {v.file_size ? `${(v.file_size / 1024 / 1024).toFixed(1)} MB` : ""} • {new Date(v.created_at).toLocaleDateString("tr-TR")}
                  </p>

                  {/* Translations status */}
                  {vTrs.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      {vTrs.map(t => (
                        <div key={t.id} className="flex items-center gap-2 text-[11px] bg-muted/50 rounded-lg px-2.5 py-1.5">
                          <Languages className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground truncate flex-1">{t.target_language_label}</span>
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4">
                            {t.mode === "lipsync" ? <Sparkles className="w-2 h-2 mr-0.5" /> :
                             t.mode === "clone_dub" ? <Mic className="w-2 h-2 mr-0.5" /> :
                             t.mode === "dub" ? <Mic className="w-2 h-2 mr-0.5" /> :
                             <Subtitles className="w-2 h-2 mr-0.5" />}
                            {t.mode === "lipsync" ? "Lip-Sync" :
                             t.mode === "clone_dub" ? "Klon Dublaj" :
                             t.mode === "dub" ? "Dublaj" : "Altyazı"}
                          </Badge>
                          {t.status === "completed" ? (
                            <div className="flex items-center gap-0.5">
                              {t.subtitle_url && (
                                <a href={t.subtitle_url} target="_blank" rel="noopener" className="p-0.5 hover:bg-muted rounded" title="SRT indir">
                                  <Download className="w-3 h-3 text-success" />
                                </a>
                              )}
                              {t.lipsync_url && (
                                <a href={t.lipsync_url} target="_blank" rel="noopener" className="p-0.5 hover:bg-muted rounded" title="Lip-sync video">
                                  <Video className="w-3 h-3 text-success" />
                                </a>
                              )}
                              {t.output_url && (t.mode === "dub" || t.mode === "clone_dub") && (
                                <a href={t.output_url} target="_blank" rel="noopener" className="p-0.5 hover:bg-muted rounded" title="Sesi indir">
                                  <FileAudio className="w-3 h-3 text-success" />
                                </a>
                              )}
                              {(t.lipsync_url || t.output_url) && (
                                <button onClick={() => copyLink(t.lipsync_url || t.output_url!)} className="p-0.5 hover:bg-muted rounded" title="Link kopyala">
                                  <Copy className="w-3 h-3 text-primary" />
                                </button>
                              )}
                            </div>
                          ) : t.status === "failed" ? (
                            <span title={t.error_message || ""}><AlertCircle className="w-3 h-3 text-destructive" /></span>
                          ) : (
                            <Loader2 className="w-3 h-3 animate-spin text-primary" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 rounded-lg text-xs h-8 gap-1.5"
                      onClick={() => { setShowTranslateDialog(v); setMode("subtitle"); setSelectedLangs([]); }}>
                      <Globe className="w-3.5 h-3.5" /> Çevir
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-lg h-8 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteVideo(v.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Translate dialog */}
      <Dialog open={!!showTranslateDialog} onOpenChange={(o) => !o && setShowTranslateDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" /> Videoyu Çevir
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {/* Mode */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Mod</Label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setMode("subtitle")}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 hover:scale-[1.02] active:scale-95
                    ${mode === "subtitle" ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                  <Subtitles className={`w-5 h-5 ${mode === "subtitle" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs font-semibold">Altyazı (SRT)</span>
                  <span className="text-[10px] text-muted-foreground">Hızlı + ekonomik</span>
                </button>
                <button onClick={() => setMode("dub")}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 hover:scale-[1.02] active:scale-95
                    ${mode === "dub" ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                  <Mic className={`w-5 h-5 ${mode === "dub" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs font-semibold">Dublaj (TTS)</span>
                  <span className="text-[10px] text-muted-foreground">Genel ses</span>
                </button>
                <button
                  onClick={() => isPremiumPlus ? setMode("clone_dub") : toast.error("Bu özellik için Premium+ rolü gereklidir")}
                  disabled={!isPremiumPlus}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 relative
                    ${!isPremiumPlus ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02] active:scale-95"}
                    ${mode === "clone_dub" ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                  <Mic className={`w-5 h-5 ${mode === "clone_dub" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs font-semibold flex items-center gap-1">Klon Dublaj
                    <Sparkles className="w-2.5 h-2.5 text-primary" />
                  </span>
                  <span className="text-[10px] text-muted-foreground">Kendi sesinle</span>
                  <Badge variant="outline" className="absolute top-1 right-1 text-[8px] py-0 px-1 h-3.5 border-primary/40 bg-primary/5 text-primary">P+</Badge>
                </button>
                <button
                  onClick={() => isPremiumPlus ? setMode("lipsync") : toast.error("Bu özellik için Premium+ rolü gereklidir")}
                  disabled={!isPremiumPlus}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 relative
                    ${!isPremiumPlus ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02] active:scale-95"}
                    ${mode === "lipsync" ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                  <Sparkles className={`w-5 h-5 ${mode === "lipsync" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs font-semibold flex items-center gap-1">Lip-Sync
                    <Sparkles className="w-2.5 h-2.5 text-primary" />
                  </span>
                  <span className="text-[10px] text-muted-foreground">Dudak senkronu</span>
                  <Badge variant="outline" className="absolute top-1 right-1 text-[8px] py-0 px-1 h-3.5 border-primary/40 bg-primary/5 text-primary">P+</Badge>
                </button>
              </div>

              {(mode === "clone_dub" || mode === "lipsync") && (
                <div className="pt-2 space-y-1.5">
                  <Label className="text-xs">Ses Klonu Seçin</Label>
                  {voiceClones.length === 0 ? (
                    <div className="text-[11px] p-3 rounded-lg border border-dashed border-warning/40 bg-warning/5 text-foreground">
                      Henüz hazır ses klonunuz yok. <b>Ayarlar → Ses Klonum</b> sekmesinden bir ses klonu oluşturun.
                    </div>
                  ) : (
                    <Select value={selectedVoiceCloneId} onValueChange={setSelectedVoiceCloneId}>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder="Bir ses klonu seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {voiceClones.map(vc => (
                          <SelectItem key={vc.id} value={vc.id}>{vc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>

            {/* Languages */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Hedef Diller</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_LANGS.map(l => {
                  const sel = !!selectedLangs.find(s => s.code === l.code);
                  return (
                    <button key={l.code} onClick={() => toggleLang(l.code, l.label)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105 active:scale-95
                        ${sel ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted"}`}>
                      <span className="mr-1">{l.flag}</span>{l.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom lang */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Özel Dil Ekle</Label>
              <div className="flex gap-2">
                <Input placeholder="Kod (ör. ja)" value={customLang.code} onChange={e => setCustomLang(s => ({ ...s, code: e.target.value.toLowerCase().slice(0, 5) }))}
                  className="w-24 rounded-lg" />
                <Input placeholder="Ad (ör. 日本語)" value={customLang.label} onChange={e => setCustomLang(s => ({ ...s, label: e.target.value }))}
                  className="flex-1 rounded-lg" />
                <Button type="button" variant="outline" onClick={addCustomLang} className="rounded-lg">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {selectedLangs.filter(l => !PRESET_LANGS.find(p => p.code === l.code)).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedLangs.filter(l => !PRESET_LANGS.find(p => p.code === l.code)).map(l => (
                    <Badge key={l.code} variant="outline" className="gap-1.5 pr-1">
                      {l.label}
                      <button onClick={() => toggleLang(l.code, l.label)}><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowTranslateDialog(null)} className="flex-1 rounded-xl">İptal</Button>
              <Button onClick={startTranslation} disabled={submitting || selectedLangs.length === 0} className="flex-1 rounded-xl gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {selectedLangs.length} Dilde Başlat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoStudio;

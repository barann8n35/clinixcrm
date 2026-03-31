import { useState, useEffect, useMemo } from "react";
import { Megaphone, Filter, Send, Loader2, Users, Tag, Globe, CalendarDays, Zap, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

interface Patient {
  id: string;
  name: string;
  phone: string | null;
  tags: string[] | null;
  created_at: string;
  platform: string | null;
}

const LANGUAGE_OPTIONS = [
  { value: "tr", label: "Türkçe" },
  { value: "en", label: "İngilizce" },
  { value: "ar", label: "Arapça" },
];

const QUICK_TEMPLATES = [
  { title: "Bayram İndirimi", content: "Değerli hastamız, bayram özel %20 indiriminden faydalanmak için hemen randevu alın! 🎉" },
  { title: "Randevu Hatırlatma", content: "Sayın hastamız, yaklaşan randevunuzu hatırlatmak isteriz. Sizi kliniğimizde görmekten mutluluk duyacağız. 📅" },
  { title: "Kontrol Daveti", content: "Merhaba! Son muayenenizin üzerinden süre geçti. Kontrol randevunuzu planlamak ister misiniz? 🏥" },
  { title: "Yeni Hizmet", content: "Kliniğimizde yeni hizmetimiz başladı! Detaylı bilgi için bizimle iletişime geçin. ✨" },
];

const Campaigns = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Filters
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedLang, setSelectedLang] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Message
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("patients").select("id, name, phone, tags, created_at, platform");
      const list = (data as Patient[]) || [];
      setPatients(list);

      const tagSet = new Set<string>();
      list.forEach(p => (p.tags || []).forEach(t => tagSet.add(t)));
      setAllTags(Array.from(tagSet).sort());
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return patients.filter(p => {
      if (selectedTags.length > 0) {
        const pTags = p.tags || [];
        if (!selectedTags.some(t => pTags.includes(t))) return false;
      }
      if (selectedLang) {
        // Mock: filter by platform as language proxy
        // In real app this would be a language field
      }
      if (dateFrom && new Date(p.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(p.created_at) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [patients, selectedTags, selectedLang, dateFrom, dateTo]);

  function toggleTag(tag: string) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  async function handleSendCampaign() {
    if (!message.trim()) { toast.error("Lütfen bir mesaj yazın"); return; }
    if (filtered.length === 0) { toast.error("Gönderilecek hasta bulunamadı"); return; }

    setSending(true);
    // Simulate sending delay
    await new Promise(r => setTimeout(r, 2000));
    setSending(false);
    toast.success(`Kampanya başarıyla sıraya alındı! ${filtered.length} kişiye gönderilecek.`);
    setMessage("");
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border/60 bg-card/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-sm">
            <Megaphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-display font-extrabold text-foreground tracking-tight">Kampanyalar</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Toplu WhatsApp mesajı gönderin</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin gradient-mesh">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 p-6">

          {/* LEFT: Audience Filter */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:col-span-2 space-y-4"
          >
            <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-5 shadow-card">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-display font-bold text-foreground">Hedef Kitle Filtreleme</h2>
              </div>

              {/* Tags */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                  <Tag className="w-3 h-3" /> Etiketler
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {loading ? (
                    <span className="text-xs text-muted-foreground">Yükleniyor...</span>
                  ) : allTags.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Etiket bulunamadı</span>
                  ) : allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all duration-150
                        ${selectedTags.includes(tag)
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                        }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                  <Globe className="w-3 h-3" /> Dil
                </label>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setSelectedLang("")}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all
                      ${!selectedLang
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40"
                      }`}
                  >
                    Tümü
                  </button>
                  {LANGUAGE_OPTIONS.map(lang => (
                    <button
                      key={lang.value}
                      onClick={() => setSelectedLang(lang.value === selectedLang ? "" : lang.value)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all
                        ${selectedLang === lang.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40"
                        }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                  <CalendarDays className="w-3 h-3" /> Kayıt Tarihi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="w-full text-[12px] bg-muted/40 border border-border rounded-xl px-3 py-2 text-foreground outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="w-full text-[12px] bg-muted/40 border border-border rounded-xl px-3 py-2 text-foreground outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              </div>
            </div>

            {/* Counter */}
            <motion.div
              key={filtered.length}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Filtrelenen Hasta Sayısı</p>
                  <p className="text-2xl font-display font-bold text-foreground">{filtered.length} <span className="text-sm font-normal text-muted-foreground">kişi</span></p>
                </div>
              </div>
            </motion.div>

            {/* Filtered list preview */}
            {filtered.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4 max-h-48 overflow-y-auto scrollbar-thin">
                <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Önizleme</p>
                <div className="space-y-1.5">
                  {filtered.slice(0, 10).map(p => (
                    <div key={p.id} className="flex items-center gap-2 text-[12px]">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold text-primary">{p.name?.[0]}</span>
                      </div>
                      <span className="text-foreground font-medium truncate">{p.name}</span>
                      <span className="text-muted-foreground ml-auto truncate">{p.phone || "—"}</span>
                    </div>
                  ))}
                  {filtered.length > 10 && (
                    <p className="text-[11px] text-muted-foreground text-center pt-1">+{filtered.length - 10} daha...</p>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {/* RIGHT: Message Editor */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="lg:col-span-3 space-y-4"
          >
            <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-display font-bold text-foreground">Mesaj Editörü</h2>
              </div>

              {/* Quick Templates */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                  <Zap className="w-3 h-3" /> Hızlı Şablonlar
                </label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TEMPLATES.map(tpl => (
                    <button
                      key={tpl.title}
                      onClick={() => setMessage(tpl.content)}
                      className="px-3.5 py-2 rounded-xl text-[11px] font-medium border border-border bg-muted/30 text-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all duration-150"
                    >
                      {tpl.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Kampanya mesajınızı buraya yazın..."
                  rows={8}
                  className="w-full text-[13px] leading-relaxed bg-muted/30 border border-border rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 resize-none transition-all"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[11px] text-muted-foreground">{message.length} karakter</span>
                  <span className="text-[11px] text-muted-foreground">WhatsApp limiti: ~4096</span>
                </div>
              </div>
            </div>

            {/* Send Button */}
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Button
                  onClick={handleSendCampaign}
                  disabled={sending || !message.trim() || filtered.length === 0}
                  className="w-full h-14 rounded-2xl text-[14px] font-bold bg-success hover:bg-success/90 text-success-foreground shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                >
                  {sending ? (
                    <span className="flex items-center gap-2.5">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Gönderiliyor...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2.5">
                      <Send className="w-5 h-5" />
                      Kampanyayı Başlat ({filtered.length} Kişiye Gönder)
                    </span>
                  )}
                </Button>
              </motion.div>
            </AnimatePresence>

            {/* Info */}
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <strong className="text-foreground">💡 Bilgi:</strong> Kampanya mesajları WhatsApp Business API üzerinden sıraya alınır. 
                Gönderim süresi hasta sayısına bağlı olarak değişebilir. Mesajlar ortalama 1-5 dakika içinde tüm alıcılara ulaşır.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Campaigns;

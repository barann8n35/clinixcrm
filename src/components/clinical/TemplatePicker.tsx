import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileText, Plus, Search, Loader2, Settings as SettingsIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export type TemplateCategory = "examination" | "epicrisis";

interface Template {
  id: string;
  title: string;
  content: string;
  category: TemplateCategory;
  sort_order: number;
}

const SEEDS: Record<TemplateCategory, { title: string; content: string }[]> = {
  examination: [
    { title: "Genel Muayene", content: "Genel durum: iyi\nBilinç: açık, koopere, oryante\nVital bulgular: TA __/__ mmHg, Nabız __ /dk, SpO2 __%\nNörolojik muayene: doğal\nPlan: " },
    { title: "Baş Ağrısı Anamnezi", content: "Şikayet süresi: \nLokalizasyon: \nKarakter: zonklayıcı / basınç hissi / batıcı\nEşlik eden: bulantı / kusma / fotofobi / fonofobi\nTetikleyen: \nKullandığı ilaç: \nÖn tanı: " },
    { title: "Post-op 1. Hafta Kontrol", content: "Yara yeri: temiz, akıntı yok\nSütur: \nAğrı: VAS __/10\nMobilizasyon: \nNörolojik defisit: yok\nÖneri: pansuman, ilaç tedavisine devam, __ gün sonra kontrol" },
  ],
  epicrisis: [
    { title: "Kraniyotomi Epikrizi", content: "Tanı: \nOperasyon: Kraniyotomi + lezyon eksizyonu\nAnestezi: Genel\nTeknik: Mikrocerrahi, nöronavigasyon eşliğinde\nKomplikasyon: yok\nPost-op nörolojik durum: stabil\nÖneri ilaç: Deksametazon tapering, antiepileptik profilaksi, antibiyotik\nKontrol: 7. gün dikiş alımı, 1 ay sonra kontrol MR" },
    { title: "Lomber Diskektomi", content: "Tanı: L4-L5 disk hernisi\nOperasyon: Mikrodiskektomi\nAnestezi: Genel\nTeknik: Mikroskop altında interlaminer yaklaşım\nKomplikasyon: yok\nPost-op: radiküler ağrıda belirgin gerileme\nÖneri: 2 hafta korse, ağır kaldırma yok, fizik tedavi 3. haftadan itibaren\nKontrol: 10. gün pansuman, 1 ay sonra kontrol" },
    { title: "Tümör Rezeksiyonu", content: "Tanı: \nOperasyon: Total / subtotal rezeksiyon\nPatoloji: beklemede\nKomplikasyon: yok\nPost-op MR: rezidü açısından değerlendirildi\nÖneri: Onkoloji konsültasyonu, radyoterapi/kemoterapi planı\nKontrol: patoloji sonucu ile 10. gün" },
  ],
};

interface Props {
  category: TemplateCategory;
  onInsert: (text: string) => void;
}

export function TemplatePicker({ category, onInsert }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) { setLoading(false); return; }

    let { data } = await supabase
      .from("clinical_templates" as any)
      .select("id,title,content,category,sort_order")
      .eq("category", category)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    let list = (Array.isArray(data) ? data : []) as Template[];

    // Seed if empty
    if (list.length === 0) {
      const seeds = SEEDS[category].map((s, i) => ({
        ...s, category, sort_order: i, user_id: uid,
      }));
      const { data: inserted } = await supabase
        .from("clinical_templates" as any)
        .insert(seeds as any)
        .select("id,title,content,category,sort_order");
      list = (Array.isArray(inserted) ? inserted : []) as Template[];
    }

    setItems(list);
    setLoading(false);
  }

  useEffect(() => { if (open) load(); }, [open, category]);

  const filtered = items.filter(t =>
    !query || t.title.toLowerCase().includes(query.toLowerCase()) || t.content.toLowerCase().includes(query.toLowerCase())
  );

  async function handleCreate() {
    if (!newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) { setSaving(false); return; }
    const { error } = await supabase
      .from("clinical_templates" as any)
      .insert({ user_id: uid, category, title: newTitle.trim(), content: newContent, sort_order: items.length } as any);
    setSaving(false);
    if (error) { toast.error("Şablon kaydedilemedi"); return; }
    toast.success("Şablon eklendi");
    setNewTitle(""); setNewContent(""); setCreating(false);
    load();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all hover:scale-105 active:scale-95"
        >
          <FileText className="w-3 h-3" />
          Şablonlar
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-0 rounded-xl">
        <div className="p-2 border-b border-border flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-muted-foreground ml-1" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Şablon ara..."
            className="flex-1 text-[12px] bg-transparent outline-none placeholder:text-muted-foreground/60"
          />
          <Link to="/settings?tab=sablonlar" className="text-muted-foreground hover:text-foreground" title="Yönet">
            <SettingsIcon className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="max-h-[260px] overflow-y-auto p-1">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-6 text-[12px] text-muted-foreground">Şablon yok</div>
          ) : filtered.map(t => (
            <button
              key={t.id}
              onClick={() => { onInsert(t.content); setOpen(false); }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors group"
            >
              <div className="text-[12px] font-semibold text-foreground">{t.title}</div>
              <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{t.content}</div>
            </button>
          ))}
        </div>

        <div className="border-t border-border p-2">
          {!creating ? (
            <button
              onClick={() => setCreating(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Yeni şablon ekle
            </button>
          ) : (
            <div className="space-y-2">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Başlık"
                className="h-8 text-[12px]"
              />
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Şablon içeriği..."
                rows={3}
                className="text-[12px] resize-none"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="flex-1 h-7 text-[11px]" onClick={() => { setCreating(false); setNewTitle(""); setNewContent(""); }}>İptal</Button>
                <Button size="sm" className="flex-1 h-7 text-[11px]" onClick={handleCreate} disabled={saving || !newTitle.trim() || !newContent.trim()}>
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Kaydet"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

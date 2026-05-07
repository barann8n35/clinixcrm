import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Save, X, Loader2, Stethoscope, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Cat = "examination" | "epicrisis";
interface Template { id: string; category: Cat; title: string; content: string; sort_order: number; }

export default function ClinicalTemplatesTab() {
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState<Cat | null>(null);
  const [draft, setDraft] = useState({ title: "", content: "" });

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("clinical_templates" as any)
      .select("id,category,title,content,sort_order")
      .order("category").order("sort_order");
    setItems((Array.isArray(data) ? data : []) as Template[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function saveEdit(id: string, title: string, content: string) {
    const { error } = await supabase.from("clinical_templates" as any)
      .update({ title, content } as any).eq("id", id);
    if (error) return toast.error("Kaydedilemedi");
    toast.success("Güncellendi"); setEditing(null); load();
  }

  async function remove(id: string) {
    if (!confirm("Şablon silinsin mi?")) return;
    const { error } = await supabase.from("clinical_templates" as any).delete().eq("id", id);
    if (error) return toast.error("Silinemedi");
    toast.success("Silindi"); load();
  }

  async function create(category: Cat) {
    if (!draft.title.trim() || !draft.content.trim()) return;
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id; if (!uid) return;
    const { error } = await supabase.from("clinical_templates" as any).insert({
      user_id: uid, category, title: draft.title.trim(), content: draft.content,
      sort_order: items.filter(i => i.category === category).length,
    } as any);
    if (error) return toast.error("Eklenemedi");
    toast.success("Eklendi"); setCreating(null); setDraft({ title: "", content: "" }); load();
  }

  function renderList(cat: Cat) {
    const list = items.filter(i => i.category === cat);
    return (
      <div className="space-y-2">
        {list.map(t => (
          <Card key={t.id} className="rounded-xl">
            <CardContent className="p-3">
              {editing === t.id ? (
                <EditRow item={t} onCancel={() => setEditing(null)} onSave={saveEdit} />
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-foreground">{t.title}</div>
                    <div className="text-[12px] text-muted-foreground whitespace-pre-wrap mt-1">{t.content}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(t.id)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(t.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {creating === cat ? (
          <Card className="rounded-xl border-primary/40">
            <CardContent className="p-3 space-y-2">
              <Input placeholder="Başlık" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              <Textarea placeholder="İçerik" rows={5} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => { setCreating(null); setDraft({ title: "", content: "" }); }}><X className="w-3.5 h-3.5 mr-1" />İptal</Button>
                <Button size="sm" onClick={() => create(cat)}><Save className="w-3.5 h-3.5 mr-1" />Kaydet</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button variant="outline" className="w-full rounded-xl" onClick={() => setCreating(cat)}>
            <Plus className="w-4 h-4 mr-1" /> Yeni şablon
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Klinik Şablonlar</CardTitle>
        <CardDescription>Muayene notu ve epikriz alanlarında tek tıkla kullanabileceğiniz hazır kalıplar.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <Tabs defaultValue="examination">
            <TabsList className="mb-4">
              <TabsTrigger value="examination" className="gap-2"><Stethoscope className="w-4 h-4" />Muayene</TabsTrigger>
              <TabsTrigger value="epicrisis" className="gap-2"><FileText className="w-4 h-4" />Epikriz</TabsTrigger>
            </TabsList>
            <TabsContent value="examination">{renderList("examination")}</TabsContent>
            <TabsContent value="epicrisis">{renderList("epicrisis")}</TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

function EditRow({ item, onCancel, onSave }: { item: Template; onCancel: () => void; onSave: (id: string, title: string, content: string) => void; }) {
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content);
  return (
    <div className="space-y-2">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} />
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onCancel}><X className="w-3.5 h-3.5 mr-1" />İptal</Button>
        <Button size="sm" onClick={() => onSave(item.id, title, content)}><Save className="w-3.5 h-3.5 mr-1" />Kaydet</Button>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { User, Building2, Plug, MessageCircle, Instagram, Save, Zap, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface QuickReply {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

const Settings = () => {
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [instagramEnabled, setInstagramEnabled] = useState(false);

  // Quick replies state
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReplies = useCallback(async () => {
    setLoadingReplies(true);
    const { data, error } = await supabase
      .from("quick_replies")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      toast({ title: "Hata", description: "Şablonlar yüklenemedi.", variant: "destructive" });
    } else {
      setQuickReplies(data || []);
    }
    setLoadingReplies(false);
  }, []);

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  const openAddModal = () => {
    setEditingReply(null);
    setFormTitle("");
    setFormContent("");
    setModalOpen(true);
  };

  const openEditModal = (reply: QuickReply) => {
    setEditingReply(reply);
    setFormTitle(reply.title);
    setFormContent(reply.content);
    setModalOpen(true);
  };

  const handleSaveReply = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      toast({ title: "Uyarı", description: "Başlık ve içerik boş olamaz.", variant: "destructive" });
      return;
    }
    setSaving(true);
    if (editingReply) {
      const { error } = await supabase
        .from("quick_replies")
        .update({ title: formTitle.trim(), content: formContent.trim() })
        .eq("id", editingReply.id);
      if (error) {
        toast({ title: "Hata", description: "Şablon güncellenemedi.", variant: "destructive" });
      } else {
        toast({ title: "Başarılı", description: "Şablon güncellendi." });
        setModalOpen(false);
        fetchReplies();
      }
    } else {
      const { error } = await supabase
        .from("quick_replies")
        .insert({ title: formTitle.trim(), content: formContent.trim() });
      if (error) {
        toast({ title: "Hata", description: "Şablon eklenemedi.", variant: "destructive" });
      } else {
        toast({ title: "Başarılı", description: "Yeni şablon eklendi." });
        setModalOpen(false);
        fetchReplies();
      }
    }
    setSaving(false);
  };

  const handleDeleteReply = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("quick_replies").delete().eq("id", id);
    if (error) {
      toast({ title: "Hata", description: "Şablon silinemedi.", variant: "destructive" });
    } else {
      toast({ title: "Başarılı", description: "Şablon silindi." });
      fetchReplies();
    }
    setDeletingId(null);
  };

  const handleSave = () => {
    toast({ title: "Kaydedildi", description: "Ayarlarınız başarıyla güncellendi." });
  };

  return (
    <div className="p-4 md:p-8 space-y-6 gradient-mesh">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-extrabold text-foreground tracking-tight">Ayarlar</h1>
        <p className="text-sm text-muted-foreground mt-1">Uygulama ayarlarını yönetin</p>
      </motion.div>

      <Tabs defaultValue="profil" className="space-y-6">
        <TabsList className="bg-muted/50 w-full sm:w-auto rounded-xl">
          <TabsTrigger value="profil" className="gap-2"><User className="h-4 w-4 hidden sm:block" />Profil</TabsTrigger>
          <TabsTrigger value="klinik" className="gap-2"><Building2 className="h-4 w-4 hidden sm:block" />Klinik</TabsTrigger>
          <TabsTrigger value="entegrasyonlar" className="gap-2"><Plug className="h-4 w-4 hidden sm:block" />Entegrasyonlar</TabsTrigger>
          <TabsTrigger value="hazir-yanitlar" className="gap-2"><Zap className="h-4 w-4 hidden sm:block" />Hazır Yanıtlar</TabsTrigger>
        </TabsList>

        {/* Profil Tab */}
        <TabsContent value="profil">
          <Card className="border-border/60 shadow-card rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-display">Profil Bilgileri</CardTitle>
              <CardDescription>Kişisel bilgilerinizi güncelleyin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Ad</Label>
                  <Input id="firstName" placeholder="Adınız" defaultValue="Dr. Ayşe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Soyad</Label>
                  <Input id="lastName" placeholder="Soyadınız" defaultValue="Yılmaz" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input id="email" type="email" placeholder="E-posta adresiniz" defaultValue="ayse@clinix.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" placeholder="+90 5XX XXX XX XX" defaultValue="+90 532 123 4567" />
              </div>
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Kaydet
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Klinik Tab */}
        <TabsContent value="klinik">
          <Card className="border-border/60 shadow-card rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-display">Klinik Bilgileri</CardTitle>
              <CardDescription>Klinik detaylarını düzenleyin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clinicName">Klinik Adı</Label>
                <Input id="clinicName" placeholder="Klinik adını girin" defaultValue="Clinix Diş Kliniği" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clinicPhone">Klinik Telefon</Label>
                  <Input id="clinicPhone" placeholder="+90 2XX XXX XXXX" defaultValue="+90 212 555 0000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinicEmail">Klinik E-posta</Label>
                  <Input id="clinicEmail" type="email" placeholder="info@klinik.com" defaultValue="info@clinix.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Textarea id="address" placeholder="Klinik adresi" defaultValue="Levent Mah. Büyükdere Cad. No:123, Beşiktaş / İstanbul" rows={3} />
              </div>
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Kaydet
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Entegrasyonlar Tab */}
        <TabsContent value="entegrasyonlar">
          <div className="space-y-4">
            <Card className="border-border/60 shadow-card rounded-2xl">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                      <MessageCircle className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">WhatsApp Business</h3>
                        <Badge variant={whatsappEnabled ? "default" : "secondary"} className={whatsappEnabled ? "bg-success text-success-foreground" : ""}>
                          {whatsappEnabled ? "Bağlı" : "Bağlı Değil"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">WhatsApp üzerinden hasta mesajlarını alın ve yanıtlayın.</p>
                    </div>
                  </div>
                  <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-card rounded-2xl">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
                      <Instagram className="h-6 w-6 text-accent-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">Instagram DM</h3>
                        <Badge variant={instagramEnabled ? "default" : "secondary"} className={instagramEnabled ? "bg-success text-success-foreground" : ""}>
                          {instagramEnabled ? "Bağlı" : "Bağlı Değil"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">Instagram DM mesajlarını CRM üzerinden yönetin.</p>
                    </div>
                  </div>
                  <Switch checked={instagramEnabled} onCheckedChange={setInstagramEnabled} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Hazır Yanıtlar Tab */}
        <TabsContent value="hazir-yanitlar">
          <Card className="border-border/60 shadow-card rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg font-display">Hazır Yanıt Şablonları</CardTitle>
                <CardDescription>Hızlı yanıt şablonlarını yönetin, ekleyin veya silin</CardDescription>
              </div>
              <Button onClick={openAddModal} className="gap-2">
                <Plus className="h-4 w-4" />
                Yeni Şablon Ekle
              </Button>
            </CardHeader>
            <CardContent>
              {loadingReplies ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Yükleniyor...</span>
                </div>
              ) : quickReplies.length === 0 ? (
                <div className="text-center py-12">
                  <Zap className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">Henüz şablon eklenmemiş.</p>
                  <Button variant="outline" className="mt-4 gap-2" onClick={openAddModal}>
                    <Plus className="h-4 w-4" />
                    İlk şablonunu ekle
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {quickReplies.map((reply) => (
                    <div
                      key={reply.id}
                      className="group flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-foreground">{reply.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{reply.content}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(reply)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteReply(reply.id)}
                          disabled={deletingId === reply.id}
                        >
                          {deletingId === reply.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingReply ? "Şablonu Düzenle" : "Yeni Şablon Ekle"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tpl-title">Şablon Başlığı</Label>
              <Input
                id="tpl-title"
                placeholder="Örn: 📍 Klinik Konum Bilgisi"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-content">Mesaj İçeriği</Label>
              <Textarea
                id="tpl-content"
                placeholder="Şablon mesajını yazın..."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              İptal
            </Button>
            <Button onClick={handleSaveReply} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;

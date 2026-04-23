import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Copy, Globe, Loader2, Save, ExternalLink, Check } from "lucide-react";

interface WidgetSettingsRow {
  id: string;
  clinic_name: string;
  welcome_message: string;
  primary_color: string;
  logo_url: string | null;
  is_active: boolean;
  ask_phone: boolean;
}

const PUBLIC_ORIGIN = typeof window !== "undefined" ? window.location.origin : "https://clinixcrm.lovable.app";
const EMBED_SNIPPET = `<script src="${PUBLIC_ORIGIN}/widget.js" async></script>`;

export default function WidgetSettingsTab() {
  const [row, setRow] = useState<WidgetSettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("widget_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (data) setRow(data as WidgetSettingsRow);
      setLoading(false);
    })();
  }, []);

  function update<K extends keyof WidgetSettingsRow>(key: K, value: WidgetSettingsRow[K]) {
    setRow((r) => (r ? { ...r, [key]: value } : r));
  }

  async function save() {
    if (!row) return;
    setSaving(true);
    const { error } = await supabase
      .from("widget_settings")
      .update({
        clinic_name: row.clinic_name,
        welcome_message: row.welcome_message,
        primary_color: row.primary_color,
        logo_url: row.logo_url,
        is_active: row.is_active,
        ask_phone: row.ask_phone,
      })
      .eq("id", row.id);
    setSaving(false);
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Kaydedildi", description: "Widget ayarları güncellendi." });
    }
  }

  function copyEmbed() {
    navigator.clipboard.writeText(EMBED_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (loading) {
    return (
      <Card className="border-border/60 shadow-card rounded-2xl">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!row) {
    return (
      <Card className="border-border/60 shadow-card rounded-2xl">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Widget ayarları bulunamadı. Lütfen sayfayı yenileyin.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status + embed */}
      <Card className="border-border/60 shadow-card rounded-2xl">
        <CardContent className="p-5 md:p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-display font-bold text-foreground">Web Sitesi Sohbet Widget'ı</h3>
                  <Badge variant={row.is_active ? "default" : "secondary"} className={row.is_active ? "bg-success text-success-foreground" : ""}>
                    {row.is_active ? "Aktif" : "Pasif"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Klinik web sitenize bu kodu yapıştırın — ziyaretçi mesajları doğrudan Inbox'a düşer.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Switch checked={row.is_active} onCheckedChange={(v) => update("is_active", v)} />
            </div>
          </div>

          {/* Embed code */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Embed Kodu</Label>
            <div className="relative">
              <pre className="bg-muted/60 rounded-xl p-3.5 text-xs font-mono overflow-x-auto border border-border/60 pr-12">
                <code>{EMBED_SNIPPET}</code>
              </pre>
              <Button
                size="sm"
                variant="ghost"
                onClick={copyEmbed}
                className="absolute top-2 right-2 h-8 w-8 p-0 rounded-lg"
                aria-label="Kopyala"
              >
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Sitenizin <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">&lt;/body&gt;</code> kapanış etiketinden hemen önce yerleştirin.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-lg gap-1.5 text-xs">
              <a href="/widget" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Önizle
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Branding & content */}
      <Card className="border-border/60 shadow-card rounded-2xl">
        <CardContent className="p-5 md:p-6 space-y-4">
          <h3 className="text-sm font-display font-bold text-foreground">Görünüm & İçerik</h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="w-clinic">Klinik Adı</Label>
              <Input
                id="w-clinic"
                value={row.clinic_name}
                onChange={(e) => update("clinic_name", e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="w-color">Ana Renk</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="w-color"
                  value={row.primary_color}
                  onChange={(e) => update("primary_color", e.target.value)}
                  className="h-10 w-14 rounded-lg border border-border cursor-pointer"
                />
                <Input
                  value={row.primary_color}
                  onChange={(e) => update("primary_color", e.target.value)}
                  maxLength={9}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="w-welcome">Karşılama Mesajı</Label>
            <Textarea
              id="w-welcome"
              value={row.welcome_message}
              onChange={(e) => update("welcome_message", e.target.value)}
              rows={2}
              maxLength={300}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="w-logo">Logo URL (opsiyonel)</Label>
            <Input
              id="w-logo"
              placeholder="https://..."
              value={row.logo_url || ""}
              onChange={(e) => update("logo_url", e.target.value || null)}
              maxLength={500}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/60 p-3.5 bg-muted/30">
            <div>
              <p className="text-sm font-medium text-foreground">Sohbet öncesi iletişim bilgisi iste</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ziyaretçinin adı (ve opsiyonel telefon) hasta kaydında saklanır.</p>
            </div>
            <Switch checked={row.ask_phone} onCheckedChange={(v) => update("ask_phone", v)} />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={save} disabled={saving} className="gap-2 rounded-lg">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Kaydet
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

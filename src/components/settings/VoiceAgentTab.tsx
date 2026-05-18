import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Phone, Save, Loader2, PhoneCall, ShieldAlert, ExternalLink, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";

interface VoiceAgentSettings {
  id: string;
  auto_call_new_leads: boolean;
  auto_call_appointment_reminders: boolean;
  auto_call_unanswered_messages: boolean;
  unanswered_threshold_minutes: number;
  daily_call_limit: number;
  call_window_start: string;
  call_window_end: string;
  always_on: boolean;
}

export default function VoiceAgentTab() {
  const { isAdmin } = useRole();
  const [settings, setSettings] = useState<VoiceAgentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testCalling, setTestCalling] = useState(false);
  const [testNumber, setTestNumber] = useState("");

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const { data, error } = await supabase
      .from("voice_agent_settings" as any)
      .select("id, auto_call_new_leads, auto_call_appointment_reminders, auto_call_unanswered_messages, unanswered_threshold_minutes, daily_call_limit, call_window_start, call_window_end, always_on")
      .limit(1)
      .maybeSingle();
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else if (data) {
      setSettings(data as unknown as VoiceAgentSettings);
    }
    setLoading(false);
  }

  function update<K extends keyof VoiceAgentSettings>(key: K, value: VoiceAgentSettings[K]) {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    const { id, ...rest } = settings;
    const { error } = await supabase
      .from("voice_agent_settings" as any)
      .update(rest as any)
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast({ title: "Kaydedilemedi", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Kaydedildi", description: "Tetikleyici ayarları güncellendi." });
    }
  }

  async function handleTestCall() {
    if (!testNumber.trim()) {
      toast({ title: "Numara gerekli", description: "Aranacak numarayı E.164 formatında gir (+90...)", variant: "destructive" });
      return;
    }
    setTestCalling(true);
    const { data, error } = await supabase.functions.invoke("place-outbound-call", {
      body: {
        to_number: testNumber.trim(),
        call_type: "manual",
        bypass_triggers: true,
      },
    });
    setTestCalling(false);
    const res = data as any;
    if (error || res?.error || res?.ok === false) {
      toast({
        title: "Arama başarısız",
        description: error?.message ?? res?.message ?? res?.error ?? "Bilinmeyen hata",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "📞 Arama başlatıldı", description: `ElevenLabs konuşma: ${res?.conversation_id ?? "—"}` });
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Yükleniyor...
        </CardContent>
      </Card>
    );
  }

  if (!settings) return null;

  const disabled = !isAdmin;

  return (
    <div className="space-y-6">
      {!isAdmin && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="py-3 flex items-center gap-2 text-sm text-warning-foreground">
            <ShieldAlert className="h-4 w-4 text-warning" />
            Bu ayarları yalnızca yöneticiler düzenleyebilir.
          </CardContent>
        </Card>
      )}

      {/* Info banner: agent voice/prompt is managed in ElevenLabs */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-foreground">
              Ses, prompt ve karşılama mesajı <span className="text-primary">ElevenLabs panelinden</span> yönetilir
            </p>
            <p className="text-muted-foreground">
              Her doktor için ayrı agent / ses / prompt ElevenLabs Conversational AI dashboard'da tanımlanır.
              Clinix bu paneli sadece <strong>ne zaman / kimi arayacağımıza</strong> karar vermek için kullanır.
            </p>
            <a
              href="https://elevenlabs.io/app/conversational-ai/agents"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:underline pt-1"
            >
              ElevenLabs Agent ayarlarını aç <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <PhoneCall className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Otomatik Arama Tetikleyicileri</CardTitle>
              <CardDescription>Asistan hangi durumlarda otomatik arasın?</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingRow
            label="Yeni lead geldiğinde otomatik karşıla"
            desc="Instagram/Web/WhatsApp'tan ilk mesaj gelen kişiyi 1 dk içinde arar."
            checked={settings.auto_call_new_leads}
            onChange={(v) => update("auto_call_new_leads", v)}
            disabled={disabled}
          />
          <SettingRow
            label="Randevu hatırlatma araması (24sa & 1sa önce)"
            desc="Yaklaşan randevular için otomatik arama yapılır."
            checked={settings.auto_call_appointment_reminders}
            onChange={(v) => update("auto_call_appointment_reminders", v)}
            disabled={disabled}
          />
          <SettingRow
            label="Cevapsız mesajlardan sonra ara"
            desc="Ekip yanıt vermediğinde asistan devreye girer."
            checked={settings.auto_call_unanswered_messages}
            onChange={(v) => update("auto_call_unanswered_messages", v)}
            disabled={disabled}
          />

          {settings.auto_call_unanswered_messages && (
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label>Cevapsızlık eşiği (dk)</Label>
                <Input
                  type="number"
                  min={5}
                  max={1440}
                  value={settings.unanswered_threshold_minutes}
                  onChange={(e) => update("unanswered_threshold_minutes", parseInt(e.target.value) || 30)}
                  disabled={disabled}
                />
              </div>
            </div>
          )}

          <Separator />

          <SettingRow
            label="7/24 Açık (saat sınırı yok)"
            desc="Asistan günün her saati arama yapabilir. Kapatırsan aşağıdaki saat aralığı geçerli olur."
            checked={settings.always_on}
            onChange={(v) => update("always_on", v)}
            disabled={disabled}
          />

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Günlük arama limiti</Label>
              <Input
                type="number"
                min={1}
                value={settings.daily_call_limit}
                onChange={(e) => update("daily_call_limit", parseInt(e.target.value) || 100)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Arama saati başlangıç</Label>
              <Input
                type="time"
                value={settings.call_window_start.slice(0, 5)}
                onChange={(e) => update("call_window_start", e.target.value)}
                disabled={disabled || settings.always_on}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Arama saati bitiş</Label>
              <Input
                type="time"
                value={settings.call_window_end.slice(0, 5)}
                onChange={(e) => update("call_window_end", e.target.value)}
                disabled={disabled || settings.always_on}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test Araması</CardTitle>
          <CardDescription>
            ElevenLabs agent'ını canlı dene. Tetikleyici/saat/limit kontrolleri bu aramada atlanır.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="+905XXXXXXXXX"
            value={testNumber}
            onChange={(e) => setTestNumber(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleTestCall} disabled={testCalling} className="gap-2">
            {testCalling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
            Hemen Ara
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || disabled} size="lg" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Değişiklikleri Kaydet
        </Button>
      </div>
    </div>
  );
}

function SettingRow({
  label, desc, checked, onChange, disabled,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-muted/30 border border-border/40">
      <div className="space-y-0.5 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

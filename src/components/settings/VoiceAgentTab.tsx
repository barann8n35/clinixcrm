import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Phone, Save, Loader2, PhoneCall, Sparkles, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";

interface VoiceAgentSettings {
  id: string;
  clinic_name: string;
  doctor_name: string;
  agent_persona: string;
  greeting_message: string;
  voice_id: string;
  language: string;
  auto_call_new_leads: boolean;
  auto_call_appointment_reminders: boolean;
  auto_call_unanswered_messages: boolean;
  unanswered_threshold_minutes: number;
  daily_call_limit: number;
  call_window_start: string;
  call_window_end: string;
  always_on: boolean;
}

const VOICE_OPTIONS = [
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah (kadın, sıcak)" },
  { id: "FGY2WhTYpPnrIDTdsKH5", label: "Laura (kadın, profesyonel)" },
  { id: "XrExE9yKIg1WjnnlVkGX", label: "Matilda (kadın, net)" },
  { id: "JBFqnCBsd6RMkjVDRZzb", label: "George (erkek, otoriter)" },
  { id: "iP95p4xoKVk53GoZ742B", label: "Chris (erkek, samimi)" },
  { id: "onwK4e9ZLuTAKqWW03F9", label: "Daniel (erkek, kurumsal)" },
];

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
      .select("*")
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
      toast({ title: "Kaydedildi", description: "Sesli asistan ayarları güncellendi." });
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
        initial_message: settings?.greeting_message,
      },
    });
    setTestCalling(false);
    if (error || (data as any)?.error) {
      toast({
        title: "Arama başarısız",
        description: error?.message ?? (data as any)?.error ?? "Bilinmeyen hata",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "📞 Arama başlatıldı", description: `Twilio SID: ${(data as any)?.twilio_sid ?? "—"}` });
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <PhoneCall className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Sesli Asistan</CardTitle>
              <CardDescription>Twilio + ElevenLabs ile hastalarınızı otomatik arar.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Klinik Adı</Label>
              <Input
                value={settings.clinic_name}
                onChange={(e) => update("clinic_name", e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Doktor Adı</Label>
              <Input
                value={settings.doctor_name}
                onChange={(e) => update("doctor_name", e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Karşılama Mesajı</Label>
            <Textarea
              rows={2}
              value={settings.greeting_message}
              onChange={(e) => update("greeting_message", e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Asistan Karakteri (Persona)
            </Label>
            <Textarea
              rows={3}
              value={settings.agent_persona}
              onChange={(e) => update("agent_persona", e.target.value)}
              disabled={disabled}
              placeholder="Nasıl konuşsun? Hangi tonda olsun?"
            />
            <p className="text-xs text-muted-foreground">
              Bu metin ElevenLabs Agent'ınızın system prompt'una eklenmek üzere referans alınır.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Ses</Label>
              <Select
                value={settings.voice_id}
                onValueChange={(v) => update("voice_id", v)}
                disabled={disabled}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VOICE_OPTIONS.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Dil</Label>
              <Select
                value={settings.language}
                onValueChange={(v) => update("language", v)}
                disabled={disabled}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tr">Türkçe</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Otomatik Arama Tetikleyicileri</CardTitle>
          <CardDescription>Hangi durumlarda asistan otomatik arasın?</CardDescription>
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
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Arama saati bitiş</Label>
              <Input
                type="time"
                value={settings.call_window_end.slice(0, 5)}
                onChange={(e) => update("call_window_end", e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test Araması</CardTitle>
          <CardDescription>Asistan'ı kendi numaranı arayarak test et.</CardDescription>
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

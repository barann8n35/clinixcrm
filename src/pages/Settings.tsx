import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { User, Building2, Plug, MessageCircle, Instagram, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Settings = () => {
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [instagramEnabled, setInstagramEnabled] = useState(false);

  const handleSave = () => {
    toast({ title: "Kaydedildi", description: "Ayarlarınız başarıyla güncellendi." });
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Ayarlar</h1>
        <p className="text-sm text-muted-foreground mt-1">Uygulama ayarlarını yönetin</p>
      </div>

      <Tabs defaultValue="profil" className="space-y-6">
        <TabsList className="bg-muted w-full sm:w-auto">
          <TabsTrigger value="profil" className="gap-2"><User className="h-4 w-4 hidden sm:block" />Profil</TabsTrigger>
          <TabsTrigger value="klinik" className="gap-2"><Building2 className="h-4 w-4 hidden sm:block" />Klinik</TabsTrigger>
          <TabsTrigger value="entegrasyonlar" className="gap-2"><Plug className="h-4 w-4 hidden sm:block" />Entegrasyonlar</TabsTrigger>
        </TabsList>

        {/* Profil Tab */}
        <TabsContent value="profil">
          <Card className="border-border">
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
          <Card className="border-border">
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
            {/* WhatsApp */}
            <Card className="border-border">
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
                      <p className="text-sm text-muted-foreground mt-0.5">
                        WhatsApp üzerinden hasta mesajlarını alın ve yanıtlayın.
                      </p>
                    </div>
                  </div>
                  <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
                </div>
              </CardContent>
            </Card>

            {/* Instagram */}
            <Card className="border-border">
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
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Instagram DM mesajlarını CRM üzerinden yönetin.
                      </p>
                    </div>
                  </div>
                  <Switch checked={instagramEnabled} onCheckedChange={setInstagramEnabled} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;

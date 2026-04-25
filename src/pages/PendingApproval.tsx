import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";

const PendingApproval = () => {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
          <Clock className="w-8 h-8 text-amber-500" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold text-foreground">Yönetici Onayı Bekleniyor</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Hesabınız başarıyla oluşturuldu. Sisteme erişim için yöneticinin onayını bekliyorsunuz.
            Onaylandığında otomatik olarak yönlendirileceksiniz.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
          <p>• Yöneticinize bilgi vererek süreci hızlandırabilirsiniz</p>
          <p>• Onay verildikten sonra bu sayfayı yenileyerek giriş yapabilirsiniz</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={() => window.location.reload()}>
            Yenile
          </Button>
          <Button variant="ghost" className="flex-1 rounded-xl text-muted-foreground" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Çıkış Yap
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, MailCheck, AlertCircle } from "lucide-react";

const Auth = () => {
  const { session, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (session) return <Navigate to="/" replace />;

  if (verificationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center">
            <MailCheck className="w-8 h-8 text-success" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold text-foreground">E-posta Doğrulama</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">{email}</strong> adresine bir doğrulama linki gönderdik.
              Lütfen gelen kutunuzu kontrol edin ve linke tıklayarak hesabınızı onaylayın.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
            <p>• E-posta birkaç dakika içinde ulaşacaktır</p>
            <p>• Spam/gereksiz klasörünü de kontrol edin</p>
            <p>• Link 24 saat geçerlidir</p>
          </div>
          <Button variant="outline" className="w-full rounded-xl" onClick={() => { setVerificationSent(false); setIsLogin(true); }}>
            Giriş sayfasına dön
          </Button>
        </div>
      </div>
    );
  }

  const validatePasswords = () => {
    if (!isLogin && password !== confirmPassword) {
      setPasswordError("Şifreler eşleşmiyor");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePasswords()) return;

    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Giriş başarılı!");
      }
    } else {
      if (!username.trim() || !fullName.trim()) {
        toast.error("Kullanıcı adı ve isim soyisim zorunludur");
        setLoading(false);
        return;
      }

      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            username: username.trim(),
            full_name: fullName.trim(),
          },
        },
      });
      if (error) {
        toast.error(error.message);
      } else if (data.user && !data.session) {
        setVerificationSent(true);
      } else if (data.session) {
        toast.success("Kayıt başarılı!");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-xl">C</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Clinix</h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Hesabınıza giriş yapın" : "Yeni hesap oluşturun"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="username">Kullanıcı Adı</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="kullanici_adi"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={!isLogin}
                  minLength={3}
                  maxLength={30}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">İsim Soyisim</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Adınız Soyadınız"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  maxLength={100}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input id="email" type="email" placeholder="ornek@klinik.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Şifre</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }} required minLength={6} />
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Şifreyi Tekrar Girin</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }}
                required={!isLogin}
                minLength={6}
                className={passwordError ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {passwordError && (
                <p className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {passwordError}
                </p>
              )}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {isLogin ? "Giriş Yap" : "Kayıt Ol"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Hesabınız yok mu?" : "Zaten hesabınız var mı?"}{" "}
          <button type="button" onClick={() => { setIsLogin(!isLogin); setPasswordError(""); }} className="text-primary font-medium hover:underline">
            {isLogin ? "Kayıt Ol" : "Giriş Yap"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;

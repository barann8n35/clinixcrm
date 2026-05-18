import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Loader2, Trash2, UserPlus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TeamMember {
  user_id: string;
  full_name: string | null;
  email: string;
  role: string;
}

interface ClinicMember {
  id: string;
  owner_user_id: string;
  member_user_id: string;
  member_role: string;
}

interface Props {
  members: TeamMember[];
  onRefresh?: () => void;
}

export default function ClinicMembersPanel({ members, onRefresh }: Props) {
  const [links, setLinks] = useState<ClinicMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [newOwner, setNewOwner] = useState<string>("");
  const [newMember, setNewMember] = useState<string>("");
  const [newRole, setNewRole] = useState<string>("secretary");

  async function fetchLinks() {
    setLoading(true);
    const { data, error } = await supabase
      .from("clinic_members" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Klinik üyelikleri alınamadı: " + error.message);
      setLinks([]);
    } else {
      setLinks((Array.isArray(data) ? data : []) as any);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchLinks();
  }, []);

  const ownerCandidates = members.filter((m) =>
    ["admin", "doctor", "premium", "premium_plus"].includes(m.role)
  );

  function nameFor(uid: string) {
    const m = members.find((x) => x.user_id === uid);
    return m?.full_name || m?.email || uid.slice(0, 8);
  }

  async function addLink() {
    if (!newOwner || !newMember) {
      toast.error("Klinik sahibi ve üye seçin.");
      return;
    }
    if (newOwner === newMember) {
      toast.error("Sahip ile üye aynı kişi olamaz.");
      return;
    }
    setSaving("new");
    const { error } = await supabase.from("clinic_members" as any).insert({
      owner_user_id: newOwner,
      member_user_id: newMember,
      member_role: newRole,
    });
    setSaving(null);
    if (error) {
      toast.error("Eklenemedi: " + error.message);
      return;
    }
    toast.success("Üye klinikle eşleştirildi.");
    setNewMember("");
    fetchLinks();
    onRefresh?.();
  }

  async function removeLink(id: string) {
    if (!confirm("Bu klinik üyeliğini kaldırmak istediğinizden emin misiniz?")) return;
    setSaving(id);
    const { error } = await supabase.from("clinic_members" as any).delete().eq("id", id);
    setSaving(null);
    if (error) {
      toast.error("Kaldırılamadı: " + error.message);
      return;
    }
    toast.success("Kaldırıldı.");
    fetchLinks();
    onRefresh?.();
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-display font-bold text-foreground">Klinik Üyelikleri</h2>
        </div>
        <span className="text-[11px] text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">
          {links.length} eşleşme
        </span>
      </div>

      {/* New link form */}
      <div className="p-4 border-b border-border/60 bg-muted/30">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_auto] gap-2 items-end">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Klinik Sahibi (Doktor)</label>
            <Select value={newOwner} onValueChange={setNewOwner}>
              <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue placeholder="Seçin..." /></SelectTrigger>
              <SelectContent>
                {ownerCandidates.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.full_name || m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Üye (Sekreter / Eş Doktor)</label>
            <Select value={newMember} onValueChange={setNewMember}>
              <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue placeholder="Seçin..." /></SelectTrigger>
              <SelectContent>
                {members
                  .filter((m) => m.user_id !== newOwner)
                  .map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.full_name || m.email} <span className="text-muted-foreground">· {m.role}</span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Rol</label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="secretary">Sekreter</SelectItem>
                <SelectItem value="doctor">Doktor (Eş)</SelectItem>
                <SelectItem value="asistan">Asistan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" className="h-9 rounded-lg gap-1.5" onClick={addLink} disabled={saving === "new"}>
            {saving === "new" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
            Ekle
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Yükleniyor...
        </div>
      ) : links.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Henüz klinik üyeliği tanımlanmamış. Çoklu doktor / sekreter çalışmaya başlamak için yukarıdan ekleyin.
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {links.map((l) => (
            <div key={l.id} className="px-5 py-3 flex items-center gap-3 text-sm">
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-foreground">{nameFor(l.member_user_id)}</span>{" "}
                <span className="text-muted-foreground">→</span>{" "}
                <span className="text-foreground">{nameFor(l.owner_user_id)}</span>{" "}
                <span className="text-muted-foreground">kliniği</span>
              </div>
              <Badge variant="outline" className="text-[10px]">{l.member_role}</Badge>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                onClick={() => removeLink(l.id)}
                disabled={saving === l.id}
              >
                {saving === l.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

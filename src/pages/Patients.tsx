import { useState, useEffect, useMemo } from "react";
import { Users, Search, Phone, MapPin, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Patient {
  id: string;
  name: string;
  phone: string | null;
  complaint: string | null;
  location: string | null;
  status: string;
  platform: string | null;
  created_at: string;
}

const statusStyles: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  discharged: "bg-muted text-muted-foreground border-border",
};

const platformIcon: Record<string, string> = {
  whatsapp: "🟢",
  telegram: "✈️",
};

const Patients = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchPatients = async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, name, phone, complaint, location, status, platform, created_at")
        .order("updated_at", { ascending: false });
      if (data) setPatients(data);
      setLoading(false);
    };
    fetchPatients();
  }, []);

  const filtered = useMemo(
    () =>
      patients.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      ),
    [patients, search]
  );

  return (
    <div className="p-4 md:p-8 space-y-5 h-full overflow-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Hastalar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {patients.length} hasta kaydı
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="İsme göre ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center justify-center min-h-[300px] gap-4">
          <Users className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">
            {search ? "Aramanızla eşleşen hasta bulunamadı." : "Henüz hasta kaydı yok."}
          </p>
        </div>
      )}

      {/* Patient Cards */}
      {!loading && filtered.length > 0 && (
        <div className="grid gap-3">
          {filtered.map((patient) => (
            <div
              key={patient.id}
              className="rounded-xl border border-border bg-card p-4 flex items-start gap-4 hover:bg-accent/30 transition-colors"
            >
              <Avatar className="h-10 w-10 shrink-0 mt-0.5">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {patient.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground truncate">
                    {patient.name}
                  </span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusStyles[patient.status] || statusStyles.pending}`}>
                    {patient.status}
                  </Badge>
                  {patient.platform && (
                    <span className="text-xs" title={patient.platform}>
                      {platformIcon[patient.platform] || patient.platform}
                    </span>
                  )}
                </div>

                {patient.complaint && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3 shrink-0" />
                    <span className="truncate">{patient.complaint}</span>
                  </p>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {patient.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {patient.phone}
                    </span>
                  )}
                  {patient.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {patient.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Patients;

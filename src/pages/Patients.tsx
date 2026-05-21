import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PatientDetailModal } from "@/components/patients/PatientDetailModal";

interface Patient {
  id: string;
  name: string;
  phone: string | null;
  complaint: string | null;
  location: string | null;
  status: string;
  platform: string | null;
  created_at: string;
  internal_notes: string | null;
}

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  discharged: "bg-muted text-muted-foreground border-border",
};

const platformIcon: Record<string, string> = {
  whatsapp: "🟢",
  telegram: "✈️",
};

const Patients = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectPatient = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) {
      setSearchParams({ id }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [setSearchParams]);

  const handleCloseModal = useCallback(() => selectPatient(null), [selectPatient]);

  useEffect(() => {
    const fetchPatients = async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, name, phone, complaint, location, status, platform, created_at, internal_notes")
        .order("updated_at", { ascending: false });
      if (data) setPatients(data);
      setLoading(false);
    };
    fetchPatients();
  }, []);

  // Handle URL ?id= parameter
  useEffect(() => {
    if (loading) return;
    const urlId = searchParams.get("id");
    if (!urlId) return;
    setSelectedId(urlId);
  }, [loading, searchParams]);

  const filtered = useMemo(
    () => patients.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [patients, search]
  );

  return (
    <div className="p-4 md:p-8 space-y-5 h-full overflow-auto gradient-mesh">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-foreground tracking-tight">Hastalar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{patients.length} hasta kaydı</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="İsme göre ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 text-sm rounded-xl border-border/60 bg-card shadow-card focus:shadow-elevated transition-shadow" />
        </div>
      </motion.div>

      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-border/60 bg-card p-12 flex flex-col items-center justify-center min-h-[300px] gap-4 shadow-card">
          <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center">
            <UserPlus className="w-9 h-9 text-muted-foreground/30" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">{search ? "Aramanızla eşleşen hasta bulunamadı" : "Henüz hasta kaydı yok"}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">{search ? "Farklı bir arama terimi deneyin" : "İlk hastanız eklendiğinde burada görünecek"}</p>
          </div>
        </motion.div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid gap-2">
          {filtered.map((patient, i) => (
            <motion.div
              key={patient.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02, duration: 0.3 }}
              onClick={() => selectPatient(patient.id)}
              className="rounded-2xl border border-border/60 bg-card p-3 md:p-4 flex items-center gap-3 shadow-card card-interactive cursor-pointer transition-all hover:border-primary/30"
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {patient.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground truncate">{patient.name}</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${statusStyles[patient.status] || statusStyles.pending}`}>
                    {patient.status}
                  </Badge>
                  {patient.platform && (
                    <span className="text-xs shrink-0" title={patient.platform}>{platformIcon[patient.platform] || patient.platform}</span>
                  )}
                  {patient.internal_notes && (
                    <span className="text-xs text-warning shrink-0" title="İç not mevcut">📝</span>
                  )}
                </div>
                {patient.complaint && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{patient.complaint}</p>
                )}
              </div>

              {patient.phone && (
                <span className="text-[11px] text-muted-foreground hidden sm:block shrink-0">{patient.phone}</span>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Universal Patient Detail Modal */}
      <PatientDetailModal
        patientId={selectedId}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default Patients;

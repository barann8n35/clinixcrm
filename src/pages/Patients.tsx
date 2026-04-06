import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Phone, MapPin, MessageSquare, UserPlus, X, StickyNote, Bell, CalendarIcon, Save, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  reminder_date: string | null;
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

  // Inline note editor state
  const [noteText, setNoteText] = useState("");
  const [reminderDate, setReminderDate] = useState<Date | undefined>(undefined);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [timePickerStep, setTimePickerStep] = useState<"hour" | "minute">("hour");
  const [selectedHour, setSelectedHour] = useState("09");

  // Select patient and sync URL
  const selectPatient = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) {
      setSearchParams({ id }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [setSearchParams]);

  useEffect(() => {
    const fetchPatients = async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, name, phone, complaint, location, status, platform, created_at, internal_notes, reminder_date")
        .order("updated_at", { ascending: false });
      if (data) setPatients(data);
      setLoading(false);
    };
    fetchPatients();
  }, []);

  // Handle URL ?id= parameter on mount and when params change
  useEffect(() => {
    if (loading) return;
    const urlId = searchParams.get("id");
    if (!urlId) return;

    const exists = patients.find(p => p.id === urlId);
    if (exists) {
      setSelectedId(urlId);
    } else {
      // Fetch from Supabase if not in current list
      const fetchSingle = async () => {
        const { data } = await supabase
          .from("patients")
          .select("id, name, phone, complaint, location, status, platform, created_at, internal_notes, reminder_date")
          .eq("id", urlId)
          .maybeSingle();
        if (data) {
          setPatients(prev => [data, ...prev]);
          setSelectedId(urlId);
        } else {
          toast.error("Hasta bulunamadı");
          setSearchParams({}, { replace: true });
        }
      };
      fetchSingle();
    }
  }, [loading, searchParams, patients.length]);

  // When selected patient changes, load their data
  useEffect(() => {
    if (!selectedId) return;
    const p = patients.find(pt => pt.id === selectedId);
    setNoteText(p?.internal_notes || "");
    if (p?.reminder_date) {
      const d = new Date(p.reminder_date);
      setReminderDate(d);
      setReminderTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    } else {
      setReminderDate(undefined);
      setReminderTime("09:00");
    }
    setDirty(false);
  }, [selectedId, patients]);

  const filtered = useMemo(
    () => patients.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [patients, search]
  );

  async function handleSaveNote() {
    if (!selectedId) return;
    setSaving(true);
    try {
      let reminderIso: string | null = null;
      if (reminderDate) {
        const [h, m] = reminderTime.split(":").map(Number);
        const dt = new Date(reminderDate);
        dt.setHours(h, m, 0, 0);
        reminderIso = dt.toISOString();
      }
      const { error } = await supabase.from("patients").update({
        internal_notes: noteText,
        reminder_active: !!reminderDate,
        reminder_date: reminderIso,
        reminder_sent: false,
      }).eq("id", selectedId);
      if (error) throw error;

      setPatients(prev => prev.map(p => p.id === selectedId ? { ...p, internal_notes: noteText, reminder_date: reminderIso } : p));
      setDirty(false);
      toast.success("Kaydedildi ✅");
    } catch {
      toast.error("Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

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
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
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
        <div className="grid gap-3">
          {filtered.map((patient, i) => (
            <div key={patient.id}>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3 }}
                onClick={() => setSelectedId(selectedId === patient.id ? null : patient.id)}
                className={cn(
                  "rounded-2xl border bg-card p-4 flex items-start gap-4 shadow-card card-interactive cursor-pointer transition-all",
                  selectedId === patient.id ? "border-primary/40 ring-1 ring-primary/20" : "border-border/60"
                )}
              >
                <Avatar className="h-10 w-10 shrink-0 mt-0.5">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {patient.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground truncate">{patient.name}</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusStyles[patient.status] || statusStyles.pending}`}>
                      {patient.status}
                    </Badge>
                    {patient.platform && (
                      <span className="text-xs" title={patient.platform}>{platformIcon[patient.platform] || patient.platform}</span>
                    )}
                    {patient.internal_notes && (
                      <span className="text-xs text-warning" title="İç not mevcut">📝</span>
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
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {patient.phone}</span>
                    )}
                    {patient.location && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {patient.location}</span>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Inline Note & Reminder Panel */}
              <AnimatePresence>
                {selectedId === patient.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-14 mr-2 mt-2 mb-1 rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">İç Not & Hatırlatıcı</span>
                      </div>

                      <textarea
                        value={noteText}
                        onChange={(e) => { setNoteText(e.target.value); setDirty(true); }}
                        placeholder="Sadece ekip için gizli notlar..."
                        rows={2}
                        className="w-full text-[12px] leading-relaxed bg-muted/40 border border-border rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                      />

                      <div className="flex items-center gap-2">
                        <Bell className="w-3.5 h-3.5 text-warning shrink-0" />
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("flex-1 justify-start text-left text-[11px] h-8 rounded-xl border-border", !reminderDate && "text-muted-foreground")}>
                              <CalendarIcon className="w-3.5 h-3.5 mr-2 text-primary" />
                              {reminderDate ? format(reminderDate, "d MMM yyyy", { locale: tr }) : "Hatırlatıcı tarihi..."}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={reminderDate}
                              onSelect={(d) => { setReminderDate(d); setDirty(true); document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); }}
                              className={cn("p-3 pointer-events-auto")}
                              disabled={(date) => { const today = new Date(); today.setHours(0, 0, 0, 0); return date < today; }}
                            />
                          </PopoverContent>
                        </Popover>
                        <Popover open={timePickerOpen} onOpenChange={(open) => { setTimePickerOpen(open); if (open) setTimePickerStep("hour"); }}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-[80px] justify-start text-[11px] h-8 rounded-xl border-border")}>
                              <Clock className="w-3.5 h-3.5 mr-1.5 text-primary" />
                              {reminderTime}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[200px] p-2" align="start">
                            {timePickerStep === "hour" ? (
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Saat Seç</p>
                                <ScrollArea className="h-[200px]">
                                  <div className="grid grid-cols-4 gap-1">
                                    {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
                                      <button key={h} onClick={() => { setSelectedHour(h); setTimePickerStep("minute"); }} className={cn("h-8 rounded-lg text-[12px] font-medium transition-colors", selectedHour === h ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground")}>
                                        {h}
                                      </button>
                                    ))}
                                  </div>
                                </ScrollArea>
                              </div>
                            ) : (
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Dakika Seç</p>
                                <div className="grid grid-cols-4 gap-1">
                                  {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((m) => (
                                    <button key={m} onClick={() => { setReminderTime(`${selectedHour}:${m}`); setDirty(true); setTimePickerOpen(false); }} className={cn("h-8 rounded-lg text-[12px] font-medium transition-colors", reminderTime.split(":")[1] === m && reminderTime.split(":")[0] === selectedHour ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground")}>
                                      {m}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                        {reminderDate && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => { setReminderDate(undefined); setDirty(true); }}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>

                      {dirty && (
                        <Button onClick={handleSaveNote} disabled={saving} className="w-full h-8 rounded-xl text-[11px] font-semibold">
                          <Save className="w-3.5 h-3.5 mr-1.5" />
                          {saving ? "Kaydediliyor..." : "Notu ve Hatırlatıcıyı Kaydet"}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Patients;

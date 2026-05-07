import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { FaWhatsapp, FaInstagram, FaTelegramPlane } from "react-icons/fa";
import { Inbox, Sparkles, Globe, Timer, MessageCircle, Send, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IconType } from "react-icons";
import { motion, AnimatePresence } from "framer-motion";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";

interface PipelineCard {
  id: string;
  name: string;
  priority: "urgent" | "medium" | "low";
  platform: string | null;
  date: string;
  postOpDays?: number;
}

const platformConfig: Record<string, { icon: IconType | React.FC<any>; color: string }> = {
  whatsapp: { icon: FaWhatsapp, color: "#25D366" },
  instagram: { icon: FaInstagram, color: "#E1306C" },
  telegram: { icon: FaTelegramPlane, color: "#0088cc" },
};

const priorityStyles: Record<string, { bg: string; text: string }> = {
  urgent: { bg: "bg-destructive/10", text: "text-destructive" },
  medium: { bg: "bg-warning/10", text: "text-warning" },
  low: { bg: "bg-primary/10", text: "text-primary" },
};

const columnKeys = ["incoming", "aiScan", "awaitingApproval", "arrived", "appointmentBooked", "postOp"] as const;
type ColumnKey = (typeof columnKeys)[number];

const statusForColumn: Record<ColumnKey, string> = {
  incoming: "pending",
  aiScan: "active",
  awaitingApproval: "approved",
  arrived: "arrived",
  appointmentBooked: "completed",
  postOp: "post_op",
};

const columnForStatus = (status: string): ColumnKey => {
  if (status === "pending") return "incoming";
  if (status === "active") return "aiScan";
  if (status === "approved" || status === "rescheduled") return "awaitingApproval";
  if (status === "arrived") return "arrived";
  if (status === "post_op") return "postOp";
  return "appointmentBooked";
};

const columnColors: Record<ColumnKey, string> = {
  incoming: "from-primary/5 to-transparent",
  aiScan: "from-warning/5 to-transparent",
  awaitingApproval: "from-success/5 to-transparent",
  arrived: "from-emerald-500/8 to-emerald-500/2",
  appointmentBooked: "from-muted to-transparent",
  postOp: "from-primary/8 to-success/3",
};

const successColumns: ColumnKey[] = ["awaitingApproval", "arrived", "appointmentBooked"];

/* ── Platform Icon ── */
const PlatformIcon = ({ platform }: { platform: string | null }) => {
  const cfg = platform ? platformConfig[platform] : null;
  if (cfg) {
    const Icon = cfg.icon;
    return <Icon className="w-4 h-4 shrink-0" style={{ color: cfg.color }} />;
  }
  return <Globe className="w-4 h-4 shrink-0 text-muted-foreground" />;
};

/* ── Post-Op Badge with Interactive Popover ── */
const PostOpBadge = ({ days, patientName, patientId }: { days: number; patientName: string; patientId: string }) => {
  const isUrgent = days <= 1;
  const defaultMessage = days <= 0
    ? `Merhaba ${patientName}, geçmiş olsun 🙏 Ameliyat sonrası durumunuz nasıl? Herhangi bir ağrınız veya şikayetiniz var mı?`
    : `Merhaba ${patientName}, ameliyatınızın üzerinden birkaç gün geçti. Kendinizi nasıl hissediyorsunuz? Herhangi bir sorunuz varsa bize ulaşabilirsiniz 😊`;

  const [draft, setDraft] = useState(defaultMessage);
  const [sending, setSending] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSend = async () => {
    if (!draft.trim()) { toast.error("Mesaj boş olamaz"); return; }
    setSending(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Oturum bulunamadı");
      const { error } = await supabase.from("messages").insert({
        patient_id: patientId,
        sender_type: "asistan",
        text: draft.trim(),
        platform: "whatsapp",
        is_processed: false,
        user_id: uid,
      });
      if (error) throw error;
      toast.success("Mesaj sıraya alındı ✅ (WhatsApp pipeline işleyecek)");
    } catch (e: any) {
      toast.error(e?.message || "Mesaj gönderilemedi");
    } finally {
      setSending(false);
    }
  };

  const handleSave = () => {
    setSaved(true);
    toast.success("Taslak kaydedildi 💾");
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <motion.button
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold mt-2 cursor-pointer hover:scale-105 transition-transform ${
            isUrgent
              ? "bg-destructive/10 text-destructive border border-destructive/20"
              : "bg-primary/10 text-primary border border-primary/20"
          }`}
        >
          <Timer className="w-3 h-3" />
          {days <= 0 ? "Bugün mesaj at!" : `${days} Gün Sonra Mesaj`}
        </motion.button>
      </PopoverTrigger>
      <PopoverContent side="top" align="center" className="w-80 p-0 rounded-2xl shadow-elevated border-border/60">
        <div className="px-4 py-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="text-[12px] font-bold text-foreground">Otomatik Mesaj Taslağı</span>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full text-[12px] text-foreground leading-relaxed bg-muted/50 rounded-xl p-3 border border-border/40 focus:ring-2 focus:ring-primary/30 focus:outline-none resize-none min-h-[90px] transition-all"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-white bg-success hover:bg-success/90 transition-all disabled:opacity-60"
            >
              {sending ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              {sending ? "Gönderiliyor..." : "Şimdi Gönder"}
            </button>
            <button
              onClick={handleSave}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border transition-all ${
                saved
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-card text-foreground border-border/60 hover:bg-muted/50"
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              {saved ? "Kaydedildi ✓" : "Değişiklikleri Kaydet"}
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/* ── Reusable card inner ── */
const CardContent = ({ card, pStyle, t, showPostOp, isArrived }: { card: PipelineCard; pStyle: { bg: string; text: string }; t: (k: string) => string; showPostOp?: boolean; isArrived?: boolean }) => (
  <>
    <div className="flex items-center justify-between mb-2 min-w-0">
      <div className="flex items-center gap-1.5 min-w-0">
        {isArrived && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
        <span className="text-sm font-semibold text-foreground truncate mr-2">{card.name}</span>
      </div>
      <PlatformIcon platform={card.platform} />
    </div>
    <div className="flex items-center gap-2 mb-2">
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${pStyle.bg} ${pStyle.text}`}>
        {t(`pipeline.${card.priority}`)}
      </span>
    </div>
    <p className="text-[11px] text-muted-foreground">{card.date}</p>
    {showPostOp && card.postOpDays !== undefined && <PostOpBadge days={card.postOpDays} patientName={card.name} patientId={card.id} />}
  </>
);

const Pipeline = () => {
  const { t } = useTranslation();
  const [columns, setColumns] = useState<Record<ColumnKey, PipelineCard[]>>({
    incoming: [],
    aiScan: [],
    awaitingApproval: [],
    arrived: [],
    appointmentBooked: [],
    postOp: [],
  });
  const suppressRealtimeUntilRef = useRef<number>(0);
  const [celebrateId, setCelebrateId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const { data } = await supabase
      .from("patients")
      .select("id, name, platform, status, complaint, created_at, updated_at")
      .order("updated_at", { ascending: false });
    if (!data) return;

    const stages: Record<ColumnKey, PipelineCard[]> = {
      incoming: [],
      aiScan: [],
      awaitingApproval: [],
      arrived: [],
      appointmentBooked: [],
      postOp: [],
    };

    const now = Date.now();
    data.forEach((p) => {
      const col = columnForStatus(p.status);
      const ageDays = Math.floor((now - new Date(p.created_at).getTime()) / 86400000);
      const priority: "urgent" | "medium" | "low" =
        p.status === "pending" && ageDays >= 1 ? "urgent" : p.status === "pending" ? "medium" : "low";
      const postOpDays = col === "postOp"
        ? Math.max(0, Math.floor((now - new Date(p.updated_at || p.created_at).getTime()) / 86400000))
        : undefined;
      const card: PipelineCard = {
        id: p.id,
        name: p.name,
        priority,
        platform: p.platform,
        date: new Date(p.created_at).toLocaleDateString("tr-TR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        postOpDays,
      };
      stages[col].push(card);
    });

    setColumns(stages);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime sync for patient status changes (e.g. from "Hasta Geldi" button)
  useEffect(() => {
    const channel = supabase
      .channel("pipeline-patients-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "patients" }, () => {
        // Skip realtime reload if we just made an optimistic drag update
        if (Date.now() < suppressRealtimeUntilRef.current) return;
        loadData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const onDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination } = result;
      if (!destination) return;
      if (source.droppableId === destination.droppableId && source.index === destination.index) return;

      const srcKey = source.droppableId as ColumnKey;
      const dstKey = destination.droppableId as ColumnKey;

      setColumns((prev) => {
        const srcCards = [...prev[srcKey]];
        const [moved] = srcCards.splice(source.index, 1);

        if (srcKey === dstKey) {
          srcCards.splice(destination.index, 0, moved);
          return { ...prev, [srcKey]: srcCards };
        }

        if (dstKey === "postOp") {
          moved.postOpDays = 3;
        } else {
          moved.postOpDays = undefined;
        }

        const dstCards = [...prev[dstKey]];
        dstCards.splice(destination.index, 0, moved);

        if (successColumns.includes(dstKey) || dstKey === "postOp") {
          setCelebrateId(moved.id);
          setTimeout(() => setCelebrateId(null), 1200);
        }

        suppressRealtimeUntilRef.current = Date.now() + 3000;
        supabase
          .from("patients")
          .update({ status: statusForColumn[dstKey] })
          .eq("id", moved.id)
          .then();

        return { ...prev, [srcKey]: srcCards, [dstKey]: dstCards };
      });
    },
    []
  );

  const columnDefs: { key: ColumnKey; labelKey: string }[] = [
    { key: "incoming", labelKey: "pipeline.incoming" },
    { key: "aiScan", labelKey: "pipeline.aiScan" },
    { key: "awaitingApproval", labelKey: "pipeline.awaitingApproval" },
    { key: "arrived", labelKey: "pipeline.arrived" },
    { key: "appointmentBooked", labelKey: "pipeline.appointmentBooked" },
    { key: "postOp", labelKey: "pipeline.postOp" },
  ];


  return (
    <div className="p-6 md:p-8 space-y-6 h-full overflow-auto gradient-mesh">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-extrabold text-foreground tracking-tight">
          {t("pipeline.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("pipeline.subtitle")}</p>
      </motion.div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
          {columnDefs.map((col, colIdx) => {
            const cards = columns[col.key] || [];
            const isPostOp = col.key === "postOp";
            const isArrivedCol = col.key === "arrived";
            return (
              <motion.div
                key={col.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: colIdx * 0.08 }}
                className={`bg-gradient-to-b ${columnColors[col.key]} rounded-2xl p-3 min-h-[400px] border ${
                  isArrivedCol ? "border-emerald-500/20" : isPostOp ? "border-primary/20" : "border-border/40"
                }`}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <div>
                    <h3 className={`text-sm font-bold ${isArrivedCol ? "text-emerald-600" : isPostOp ? "text-primary" : "text-foreground"}`}>
                      {col.key === "arrived" ? "Bekleme Salonu" : t(col.labelKey)}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {cards.length} {t("pipeline.lead")}
                    </p>
                  </div>
                  {cards.length > 0 && (
                    <span className={`min-w-[22px] h-[22px] flex items-center justify-center rounded-full text-[11px] font-bold shadow-sm border ${
                      isArrivedCol
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : isPostOp
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-card text-foreground border-border/40"
                    }`}>
                      {cards.length}
                    </span>
                  )}
                </div>

                <Droppable droppableId={col.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2.5 min-h-[60px] rounded-xl transition-all duration-200 p-1 ${
                        snapshot.isDraggingOver
                          ? "bg-primary/5 ring-2 ring-primary/20"
                          : ""
                      }`}
                    >
                      {cards.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-2">
                            {isArrivedCol ? (
                              <CheckCircle2 className="w-5 h-5 text-muted-foreground/30" />
                            ) : isPostOp ? (
                              <Timer className="w-5 h-5 text-muted-foreground/30" />
                            ) : (
                              <Inbox className="w-5 h-5 text-muted-foreground/30" />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground/60">
                            {isArrivedCol
                              ? "Bekleme salonunda hasta yok"
                              : isPostOp
                              ? "Post-op takip bekleyen hasta yok"
                              : t("pipeline.empty", "Bu aşamada lead yok")}
                          </p>
                        </div>
                      )}
                      {cards.map((card, index) => {
                        const pStyle = priorityStyles[card.priority];
                        const isCelebrating = celebrateId === card.id;
                        return (
                          <Draggable key={card.id} draggableId={card.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{
                                  ...provided.draggableProps.style,
                                  ...(snapshot.isDragging
                                    ? { width: (provided.draggableProps.style as any)?.width || "auto" }
                                    : {}),
                                }}
                                className={`relative overflow-hidden bg-card rounded-2xl border p-4 cursor-grab active:cursor-grabbing transition-shadow duration-200 ${
                                  isArrivedCol
                                    ? "border-emerald-500/30"
                                    : "border-border/60"
                                } ${
                                  snapshot.isDragging
                                    ? "shadow-float ring-2 ring-primary/30 rotate-[2deg] scale-[1.03] z-50"
                                    : "shadow-card hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-300"
                                }`}
                              >
                                <AnimatePresence>
                                  {isCelebrating && (
                                    <motion.div
                                      initial={{ scale: 0, opacity: 0.7 }}
                                      animate={{ scale: 3, opacity: 0 }}
                                      exit={{ opacity: 0 }}
                                      transition={{ duration: 1, ease: "easeOut" }}
                                      className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-success/40 pointer-events-none"
                                    />
                                  )}
                                </AnimatePresence>
                                <AnimatePresence>
                                  {isCelebrating && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 4 }}
                                      animate={{ opacity: 1, y: -2 }}
                                      exit={{ opacity: 0 }}
                                      transition={{ duration: 0.5 }}
                                      className="absolute top-1 right-2 pointer-events-none"
                                    >
                                      <Sparkles className="w-4 h-4 text-success" />
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                <CardContent card={card} pStyle={pStyle} t={t} showPostOp={isPostOp} isArrived={isArrivedCol} />
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </motion.div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};

export default Pipeline;

import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, Sparkles, Bot, User, ToggleLeft, ToggleRight, ChevronLeft, Info, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { FaWhatsapp, FaInstagram, FaTelegramPlane } from "react-icons/fa";
import { useToast } from "@/hooks/use-toast";

type MessageType = "patient" | "ai" | "secretary" | "admin" | "doctor";

interface Message {
  id: string;
  sender_type: MessageType;
  text: string;
  created_at: string;
  platform?: string | null;
}

interface Patient {
  id: string;
  name: string;
  platform: string | null;
}

const platformConfig: Record<string, { icon: React.ComponentType<any>; color: string; label: string }> = {
  whatsapp: { icon: FaWhatsapp, color: "#25D366", label: "WhatsApp" },
  telegram: { icon: FaTelegramPlane, color: "#0088cc", label: "Telegram" },
  instagram: { icon: FaInstagram, color: "#E1306C", label: "Instagram" },
};

const messageVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

function TypingIndicator() {
  return (
    <div className="flex flex-col items-start">
      <div className="bg-chat-ai border border-chat-ai-border rounded-2xl rounded-bl-md px-5 py-3.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground/70">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1 h-5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg, t, patientName }: { msg: Message; t: (key: string) => string; patientName?: string }) {
  const time = format(new Date(msg.created_at), "HH:mm");
  const isOutgoing = msg.sender_type === "admin" || msg.sender_type === "doctor";

  const getConfig = () => {
    switch (msg.sender_type) {
      case "patient":
        return {
          bg: "bg-chat-patient",
          border: "border-chat-patient-border",
          label: patientName || "Bilinmeyen Hasta",
          icon: (() => {
            const cfg = msg.platform ? platformConfig[msg.platform] : null;
            if (cfg) { const PIcon = cfg.icon; return <PIcon className="w-3.5 h-3.5" style={{ color: cfg.color }} />; }
            return null;
          })(),
          align: "items-start",
          rounded: "rounded-bl-md",
        };
      case "secretary":
        return {
          bg: "bg-chat-ai",
          border: "border-chat-ai-border",
          label: "AI Asistan 🤖",
          icon: <Sparkles className="w-3.5 h-3.5 text-primary" />,
          align: "items-start",
          rounded: "rounded-bl-md",
        };
      case "admin":
      case "doctor":
        return {
          bg: "bg-chat-secretary",
          border: "border-chat-secretary-border",
          label: "Siz (Dr. Ercan)",
          icon: <User className="w-3.5 h-3.5 text-success" />,
          align: "items-end",
          rounded: "rounded-br-md",
        };
      default:
        return {
          bg: "bg-chat-ai",
          border: "border-chat-ai-border",
          label: msg.sender_type,
          icon: <Sparkles className="w-3.5 h-3.5 text-primary" />,
          align: "items-start",
          rounded: "rounded-bl-md",
        };
    }
  };

  const c = getConfig();

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className={`flex flex-col ${c.align}`}
    >
      <div className={`max-w-[85%] md:max-w-[70%] ${c.bg} border ${c.border} rounded-2xl px-4 md:px-5 py-3 md:py-3.5 ${c.rounded}`}>
        <div className="flex items-center gap-1.5 mb-1">
          {c.icon}
          <span className="text-[11px] font-semibold text-foreground/70">{c.label}</span>
          {msg.platform && (
            <span className="text-[10px] text-muted-foreground">via {platformConfig[msg.platform]?.label}</span>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">{time}</span>
        </div>
        <p className="text-[13px] text-foreground leading-relaxed">{msg.text}</p>
      </div>
    </motion.div>
  );
}

const QUICK_REPLIES = [
  { label: "📍 Klinik Konum Bilgisi", text: "Kliniğimizin adresi: [Adres bilgisi]. Google Maps linki: [link]. Otopark mevcuttur." },
  { label: "🍽️ Açlık Uyarısı", text: "Lütfen işlem öncesi en az 8 saat boyunca bir şey yememeniz gerekmektedir. Su içebilirsiniz." },
  { label: "✅ Randevu Teyit", text: "Randevunuz [tarih] günü saat [saat]'te onaylanmıştır. Lütfen 15 dakika önce klinikte olunuz." },
];

interface ChatInterfaceProps {
  patientId: string;
  onBack?: () => void;
  onInfoClick?: () => void;
  showBackButton?: boolean;
}

export function ChatInterface({ patientId, onBack, onInfoClick, showBackButton }: ChatInterfaceProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [aiPaused, setAiPaused] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [patient, setPatient] = useState<Patient & { is_ai_active?: boolean | null } | null>(null);
  const [sending, setSending] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sortMessages = (msgs: Message[]) =>
    [...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      setPatient(null);
      setMessages([]);
      setShowTyping(false);

      const [{ data: p }, { data: msgs }] = await Promise.all([
        supabase.from("patients").select("id, name, platform, is_ai_active").eq("id", patientId).maybeSingle(),
        supabase.from("messages").select("*").eq("patient_id", patientId).order("created_at", { ascending: true }),
      ]);

      if (!isMounted) return;
      setPatient(p);
      setAiPaused(p?.is_ai_active === false);
      setMessages(sortMessages((msgs as Message[]) || []));
    }

    loadInitial();

    const channel = supabase
      .channel(`messages-realtime-${patientId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        if (!isMounted) return;
        const newMsg = payload.new as Message & { patient_id: string };
        if (newMsg.patient_id !== patientId) return;

        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return sortMessages([...prev, newMsg]);
        });

        if (newMsg.sender_type !== "secretary") {
          setShowTyping(false);
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [patientId]);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, [messages, showTyping]);

  async function handleToggleAi() {
    const newValue = !aiPaused;
    setAiPaused(newValue);
    const { error } = await supabase.from("patients").update({ is_ai_active: !newValue }).eq("id", patientId);
    if (error) {
      setAiPaused(!newValue);
      toast({ title: "Hata", description: "Güncelleme başarısız oldu.", variant: "destructive" });
    } else {
      toast({ title: newValue ? "AI Duraklatıldı" : "AI Aktif", description: "Başarıyla güncellendi." });
    }
  }

  async function handleSend() {
    if (!inputValue.trim() || sending) return;
    setSending(true);
    setShowTyping(true);
    await Promise.all([
      supabase.from("messages").insert({
        patient_id: patientId,
        sender_type: "admin",
        text: inputValue.trim(),
        platform: null,
      }),
      supabase.from("patients").update({ is_ai_active: false }).eq("id", patientId),
    ]);
    setAiPaused(true);
    setInputValue("");
    setSending(false);
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-3 md:px-5 py-3 md:py-3.5 border-b border-border flex items-center justify-between gap-2 bg-card">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="lg:hidden z-10 flex items-center gap-1 px-3 py-2 rounded-full bg-secondary border border-border text-foreground hover:bg-accent transition-colors shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs font-medium">{t("inbox.back")}</span>
            </button>
          )}
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <span className="text-primary font-semibold text-xs">
              {patient?.name?.split(" ").map(n => n[0]).join("") || "?"}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-semibold text-sm md:text-[15px] text-foreground truncate">{patient?.name || t("common.loading")}</h2>
              {patient?.platform && (() => {
                const cfg = platformConfig[patient.platform!];
                if (cfg) { const PIcon = cfg.icon; return <PIcon className="w-4 h-4" style={{ color: cfg.color }} />; }
                return null;
              })()}
            </div>
            <p className="text-[11px] text-muted-foreground">{t("inbox.online")}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onInfoClick && (
            <button onClick={onInfoClick} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <Info className="w-4.5 h-4.5" />
            </button>
          )}
          <button
            onClick={handleToggleAi}
            className={`flex items-center gap-1.5 px-2.5 md:px-3.5 py-1.5 rounded-full text-[11px] md:text-[12px] font-medium transition-all duration-200 border
              ${aiPaused
                ? "bg-warning/10 border-warning/30 text-warning"
                : "bg-success/10 border-success/30 text-success"
              }`}
          >
            {aiPaused ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
            <span className="hidden sm:inline">{aiPaused ? t("inbox.aiPaused") : t("inbox.aiActive")}</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 md:px-8 py-4 md:py-5 space-y-3 md:space-y-4">
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-muted-foreground font-medium">{t("inbox.today")}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} t={t} patientName={patient?.name} />
          ))}
        </AnimatePresence>

        {showTyping && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <TypingIndicator />
          </motion.div>
        )}

        {!aiPaused && !showTyping && (
          <div className="flex items-center gap-2 px-3 py-2">
            <Bot className="w-3.5 h-3.5 text-primary/60 animate-pulse-soft" />
            <span className="text-[11px] text-muted-foreground italic">{t("inbox.aiMonitoring")}</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 md:px-6 py-3 md:py-4 border-t border-border bg-card relative">
        {/* Quick Replies Popup */}
        {showQuickReplies && (
          <div className="absolute bottom-full left-3 right-3 md:left-6 md:right-6 mb-2 bg-card border border-border rounded-xl shadow-elevated overflow-hidden z-10">
            <div className="px-3 py-2 border-b border-border">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hızlı Yanıtlar</span>
            </div>
            {QUICK_REPLIES.map((qr, i) => (
              <button
                key={i}
                onClick={() => {
                  setInputValue(qr.text);
                  setShowQuickReplies(false);
                }}
                className="w-full text-left px-3 py-2.5 hover:bg-accent/50 transition-colors border-b border-border last:border-b-0"
              >
                <span className="text-[12px] font-medium text-foreground">{qr.label}</span>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{qr.text}</p>
              </button>
            ))}
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2 md:gap-3 bg-muted/50 rounded-2xl px-3 md:px-4 py-2.5 md:py-3">
          <button
            type="button"
            onClick={() => setShowQuickReplies(!showQuickReplies)}
            className={`p-1.5 rounded-lg transition-colors ${showQuickReplies ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
          >
            <Zap className="w-[18px] h-[18px]" />
          </button>
          <button type="button" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <Paperclip className="w-[18px] h-[18px]" />
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t("inbox.typeMessage")}
            className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button type="submit" disabled={sending || !inputValue.trim()} className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

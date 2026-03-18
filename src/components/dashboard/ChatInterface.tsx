import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, Sparkles, Bot, User, ToggleLeft, ToggleRight, ChevronLeft, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

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

const platformLabels: Record<string, { icon: string; label: string }> = {
  whatsapp: { icon: "🟢", label: "WhatsApp" },
  telegram: { icon: "✈️", label: "Telegram" },
  instagram: { icon: "🟣", label: "Instagram" },
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
          icon: msg.platform ? <span className="text-xs">{platformLabels[msg.platform]?.icon}</span> : null,
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
          label: "Siz 👨‍⚕️",
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
            <span className="text-[10px] text-muted-foreground">via {platformLabels[msg.platform]?.label}</span>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">{time}</span>
        </div>
        <p className="text-[13px] text-foreground leading-relaxed">{msg.text}</p>
      </div>
    </motion.div>
  );
}

interface ChatInterfaceProps {
  patientId: string;
  onBack?: () => void;
  onInfoClick?: () => void;
  showBackButton?: boolean;
}

export function ChatInterface({ patientId, onBack, onInfoClick, showBackButton }: ChatInterfaceProps) {
  const { t } = useTranslation();
  const [aiPaused, setAiPaused] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [sending, setSending] = useState(false);
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
        supabase.from("patients").select("id, name, platform").eq("id", patientId).maybeSingle(),
        supabase.from("messages").select("*").eq("patient_id", patientId).order("created_at", { ascending: true }),
      ]);

      if (!isMounted) return;
      setPatient(p);
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

  async function handleSend() {
    if (!inputValue.trim() || sending) return;
    setSending(true);
    setShowTyping(true);
    await supabase.from("messages").insert({
      patient_id: patientId,
      sender_type: "admin",
      text: inputValue.trim(),
      platform: null,
    });
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
              {patient?.platform && (
                <span className="text-xs">{platformLabels[patient.platform]?.icon}</span>
              )}
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
            onClick={() => setAiPaused(!aiPaused)}
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
      <div className="px-3 md:px-6 py-3 md:py-4 border-t border-border bg-card">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2 md:gap-3 bg-muted/50 rounded-2xl px-3 md:px-4 py-2.5 md:py-3">
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

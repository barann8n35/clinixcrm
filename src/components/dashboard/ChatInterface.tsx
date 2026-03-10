import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, Sparkles, Bot, User, ToggleLeft, ToggleRight, ChevronLeft, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

type MessageType = "patient" | "ai" | "secretary";

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
  whatsapp: { icon: "💬", label: "WhatsApp" },
  telegram: { icon: "✈️", label: "Telegram" },
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

function MessageBubble({ msg }: { msg: Message }) {
  const time = format(new Date(msg.created_at), "HH:mm");
  const configs: Record<MessageType, { bg: string; border: string; label: string; icon: React.ReactNode; align: string }> = {
    patient: {
      bg: "bg-chat-patient",
      border: "border-chat-patient-border",
      label: "Patient",
      icon: msg.platform ? <span className="text-xs">{platformLabels[msg.platform]?.icon}</span> : null,
      align: "items-start",
    },
    ai: {
      bg: "bg-chat-ai",
      border: "border-chat-ai-border",
      label: "AI Assistant",
      icon: <Sparkles className="w-3.5 h-3.5 text-primary" />,
      align: "items-start",
    },
    secretary: {
      bg: "bg-chat-secretary",
      border: "border-chat-secretary-border",
      label: "You",
      icon: <User className="w-3.5 h-3.5 text-success" />,
      align: "items-end",
    },
  };

  const c = configs[msg.sender_type];

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className={`flex flex-col ${c.align}`}
    >
      <div className={`max-w-[85%] md:max-w-[70%] ${c.bg} border ${c.border} rounded-2xl px-4 md:px-5 py-3 md:py-3.5 ${msg.sender_type === "secretary" ? "rounded-br-md" : "rounded-bl-md"}`}>
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
  const [aiPaused, setAiPaused] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [sending, setSending] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setPatient(null);
      setMessages([]);

      const [{ data: p }, { data: msgs }] = await Promise.all([
        supabase
          .from("patients")
          .select("id, name, platform")
          .eq("id", patientId)
          .maybeSingle(),
        supabase
          .from("messages")
          .select("*")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: true }),
      ]);

      if (!isMounted) return;
      setPatient(p);
      const newMsgs = (msgs as Message[]) || [];
      setMessages(newMsgs);

      // Hide typing indicator when a new non-secretary message arrives
      if (newMsgs.length > prevCountRef.current) {
        const latest = newMsgs[newMsgs.length - 1];
        if (latest && latest.sender_type !== "secretary") {
          setShowTyping(false);
        }
      }
      prevCountRef.current = newMsgs.length;
    }

    load();

    const channel = supabase
      .channel(`messages-${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `patient_id=eq.${patientId}`,
        },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [patientId]);

  // Smooth scroll to bottom on new messages or typing indicator
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
      sender_type: "secretary",
      text: inputValue.trim(),
      platform: null,
    });
    setInputValue("");
    setSending(false);
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-3 md:px-5 py-3 md:py-3.5 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="lg:hidden z-10 flex items-center gap-1 px-3 py-2 rounded-full bg-secondary border border-border text-foreground hover:bg-accent transition-colors shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs font-medium">Back</span>
            </button>
          )}
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <span className="text-primary font-semibold text-xs">
              {patient?.name?.split(" ").map(n => n[0]).join("") || "?"}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-semibold text-sm md:text-[15px] text-foreground truncate">{patient?.name || "Loading..."}</h2>
              {patient?.platform && (
                <>
                  <span className="text-xs">{platformLabels[patient.platform]?.icon}</span>
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">{platformLabels[patient.platform]?.label}</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Online · Last seen 2 min ago</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onInfoClick && (
            <button
              onClick={onInfoClick}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Info className="w-4.5 h-4.5" />
            </button>
          )}
          <button
            onClick={() => setAiPaused(!aiPaused)}
            className={`flex items-center gap-1.5 px-2.5 md:px-3.5 py-1.5 rounded-full text-[11px] md:text-[12px] font-medium transition-all duration-200 border
              ${aiPaused
                ? "bg-warning/10 border-warning/30 text-warning"
                : "bg-primary/8 border-primary/20 text-primary"
              }`}
          >
            {aiPaused ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
            <span className="hidden sm:inline">{aiPaused ? "AI Paused" : "AI Active"}</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 md:px-8 py-4 md:py-5 space-y-3 md:space-y-4">
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-muted-foreground font-medium">Today</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
        </AnimatePresence>

        {showTyping && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <TypingIndicator />
          </motion.div>
        )}

        {!aiPaused && !showTyping && (
          <div className="flex items-center gap-2 px-3 py-2">
            <Bot className="w-3.5 h-3.5 text-primary/60 animate-pulse-soft" />
            <span className="text-[11px] text-muted-foreground italic">AI is monitoring this conversation...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 md:px-6 py-3 md:py-4 border-t border-border">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2 md:gap-3 bg-muted rounded-2xl px-3 md:px-4 py-2.5 md:py-3"
        >
          <button type="button" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <Paperclip className="w-[18px] h-[18px]" />
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            type="submit"
            disabled={sending || !inputValue.trim()}
            className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

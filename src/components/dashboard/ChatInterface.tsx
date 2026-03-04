import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, Sparkles, Bot, User, ToggleLeft, ToggleRight } from "lucide-react";
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
    <div className={`flex flex-col ${c.align} animate-slide-in-right`}>
      <div className={`max-w-[85%] ${c.bg} border ${c.border} rounded-2xl px-4 py-3 ${msg.sender_type === "secretary" ? "rounded-br-md" : "rounded-bl-md"}`}>
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
    </div>
  );
}

export function ChatInterface({ patientId }: { patientId: string }) {
  const [aiPaused, setAiPaused] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      setMessages((msgs as Message[]) || []);
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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!inputValue.trim() || sending) return;
    setSending(true);
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
    <div className="flex flex-col h-full bg-card border-x border-border">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
            <span className="text-primary font-semibold text-xs">
              {patient?.name?.split(" ").map(n => n[0]).join("") || "?"}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-semibold text-[15px] text-foreground">{patient?.name || "Loading..."}</h2>
              {patient?.platform && (
                <>
                  <span className="text-xs">{platformLabels[patient.platform]?.icon}</span>
                  <span className="text-[11px] text-muted-foreground">{platformLabels[patient.platform]?.label}</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Online · Last seen 2 min ago</p>
          </div>
        </div>

        <button
          onClick={() => setAiPaused(!aiPaused)}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 border
            ${aiPaused
              ? "bg-warning/10 border-warning/30 text-warning"
              : "bg-primary/8 border-primary/20 text-primary"
            }`}
        >
          {aiPaused ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
          {aiPaused ? "AI Paused" : "AI Active"}
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-3">
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-muted-foreground font-medium">Today</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {!aiPaused && (
          <div className="flex items-center gap-2 px-3 py-2">
            <Bot className="w-3.5 h-3.5 text-primary/60 animate-pulse-soft" />
            <span className="text-[11px] text-muted-foreground italic">AI is monitoring this conversation...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2"
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

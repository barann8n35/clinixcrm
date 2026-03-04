import { useState } from "react";
import { Send, Paperclip, Sparkles, Bot, User, ToggleLeft, ToggleRight } from "lucide-react";

type MessageType = "patient" | "ai" | "secretary";

interface Message {
  id: number;
  type: MessageType;
  text: string;
  time: string;
  platform?: string;
}

const messages: Message[] = [
  { id: 1, type: "patient", text: "Merhaba, sırt ağrısı için randevu almak istiyorum. En yakın müsait gün ne zaman?", time: "10:22", platform: "whatsapp" },
  { id: 2, type: "ai", text: "Hastanın geçmiş kayıtlarını kontrol ettim. Büşra Zeydan, son 3 ayda 2 kez ortopedi bölümünü ziyaret etmiş. Dr. Öztürk'ün yarın 14:30'da müsait bir slotu var. Randevuyu onaylamak ister misiniz?", time: "10:22" },
  { id: 3, type: "secretary", text: "Büşra Hanım, yarın saat 14:30'da Dr. Öztürk ile bir randevunuz uygun görünüyor. Size uyar mı?", time: "10:23" },
  { id: 4, type: "patient", text: "Evet, çok teşekkürler! Yarın 14:30 uygun. Yanıma ne getirmem gerekiyor?", time: "10:25", platform: "whatsapp" },
  { id: 5, type: "ai", text: "Standart ortopedi ziyareti gereksinimleri: Kimlik, SGK kartı ve varsa önceki röntgen sonuçları. Otomatik hatırlatma mesajı gönderilsin mi?", time: "10:25" },
  { id: 6, type: "secretary", text: "Kimliğinizi ve SGK kartınızı getirmeniz yeterli olacaktır. Eğer daha önce çektirilmiş röntgen sonuçlarınız varsa onları da getirirseniz iyi olur. 😊", time: "10:26" },
];

const platformLabels: Record<string, { icon: string; label: string }> = {
  whatsapp: { icon: "💬", label: "WhatsApp" },
  telegram: { icon: "✈️", label: "Telegram" },
};

function MessageBubble({ msg }: { msg: Message }) {
  const configs: Record<MessageType, { bg: string; border: string; label: string; icon: React.ReactNode; align: string }> = {
    patient: {
      bg: "bg-chat-patient",
      border: "border-chat-patient-border",
      label: "Büşra Zeydan",
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

  const c = configs[msg.type];

  return (
    <div className={`flex flex-col ${c.align} animate-slide-in-right`}>
      <div className={`max-w-[85%] ${c.bg} border ${c.border} rounded-2xl px-4 py-3 ${msg.type === "secretary" ? "rounded-br-md" : "rounded-bl-md"}`}>
        <div className="flex items-center gap-1.5 mb-1">
          {c.icon}
          <span className="text-[11px] font-semibold text-foreground/70">{c.label}</span>
          {msg.platform && (
            <span className="text-[10px] text-muted-foreground">via {platformLabels[msg.platform]?.label}</span>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">{msg.time}</span>
        </div>
        <p className="text-[13px] text-foreground leading-relaxed">{msg.text}</p>
      </div>
    </div>
  );
}

export function ChatInterface() {
  const [aiPaused, setAiPaused] = useState(false);
  const [inputValue, setInputValue] = useState("");

  return (
    <div className="flex flex-col h-full bg-card border-x border-border">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
            <span className="text-primary font-semibold text-xs">BZ</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-semibold text-[15px] text-foreground">Büşra Zeydan</h2>
              <span className="text-xs">💬</span>
              <span className="text-[11px] text-muted-foreground">WhatsApp</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Online · Last seen 2 min ago</p>
          </div>
        </div>

        {/* AI Toggle */}
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
      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-3">
        {/* Date separator */}
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-muted-foreground font-medium">Today, March 4</span>
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
        <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
          <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <Paperclip className="w-[18px] h-[18px]" />
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

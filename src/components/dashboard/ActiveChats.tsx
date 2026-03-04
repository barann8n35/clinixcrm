import { MessageCircle } from "lucide-react";

const chats = [
  { name: "Büşra Zeydan", lastMsg: "Appointment for back pain?", time: "2m", unread: true, platform: "whatsapp" },
  { name: "Mehmet Kaya", lastMsg: "Can I reschedule to Friday?", time: "8m", unread: true, platform: "telegram" },
  { name: "Fatma Demir", lastMsg: "Thanks, see you tomorrow!", time: "15m", unread: false, platform: "whatsapp" },
  { name: "Ali Yıldırım", lastMsg: "What time does the clinic open?", time: "22m", unread: false, platform: "whatsapp" },
  { name: "Zeynep Arslan", lastMsg: "Is Dr. Öztürk available?", time: "1h", unread: false, platform: "telegram" },
  { name: "Hasan Çelik", lastMsg: "I need to cancel my visit", time: "2h", unread: false, platform: "whatsapp" },
];

const platformIcon: Record<string, string> = {
  whatsapp: "💬",
  telegram: "✈️",
};

export function ActiveChats() {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-2">
      {chats.map((chat, i) => (
        <button
          key={i}
          className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group
            ${i === 0 ? "bg-primary/8 border border-primary/15" : "hover:bg-accent"}`}
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold
              ${i === 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
              {chat.name.split(" ").map(n => n[0]).join("")}
            </div>
            {chat.unread && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-unread border-2 border-card animate-pulse-soft" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className={`text-[13px] truncate ${chat.unread ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
                {chat.name}
              </span>
              <span className="text-[10px] text-muted-foreground flex-shrink-0">{chat.time}</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px]">{platformIcon[chat.platform]}</span>
              <span className={`text-[12px] truncate ${chat.unread ? "text-foreground/70 font-medium" : "text-muted-foreground"}`}>
                {chat.lastMsg}
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

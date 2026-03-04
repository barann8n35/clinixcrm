import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ChatItem {
  id: string;
  name: string;
  lastMsg: string;
  time: string;
  unread: boolean;
  platform: string;
}

const platformIcon: Record<string, string> = {
  whatsapp: "💬",
  telegram: "✈️",
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

interface Props {
  selectedPatientId: string;
  onSelectPatient: (id: string) => void;
}

export function ActiveChats({ selectedPatientId, onSelectPatient }: Props) {
  const [chats, setChats] = useState<ChatItem[]>([]);

  useEffect(() => {
    async function load() {
      const { data: patients } = await supabase
        .from("patients")
        .select("id, name, platform")
        .order("updated_at", { ascending: false });

      if (!patients) return;

      const chatItems: ChatItem[] = [];

      for (const p of patients) {
        const { data: msgs } = await supabase
          .from("messages")
          .select("text, created_at, sender_type")
          .eq("patient_id", p.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const lastMsg = msgs?.[0];
        chatItems.push({
          id: p.id,
          name: p.name,
          lastMsg: lastMsg?.text?.substring(0, 40) + (lastMsg?.text && lastMsg.text.length > 40 ? "..." : "") || "No messages",
          time: lastMsg ? timeAgo(lastMsg.created_at) : "",
          unread: lastMsg?.sender_type === "patient",
          platform: p.platform || "whatsapp",
        });
      }

      setChats(chatItems);
    }

    load();

    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-2">
      {chats.map((chat) => (
        <button
          key={chat.id}
          onClick={() => onSelectPatient(chat.id)}
          className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group
            ${chat.id === selectedPatientId ? "bg-primary/8 border border-primary/15" : "hover:bg-accent"}`}
        >
          <div className="relative flex-shrink-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold
              ${chat.id === selectedPatientId ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
              {chat.name.split(" ").map(n => n[0]).join("")}
            </div>
            {chat.unread && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-unread border-2 border-card animate-pulse-soft" />
            )}
          </div>

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

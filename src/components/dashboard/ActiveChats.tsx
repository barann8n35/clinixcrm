import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Search, Globe, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FaWhatsapp, FaInstagram, FaTelegramPlane } from "react-icons/fa";
import { IconType } from "react-icons";

const platformConfig: Record<string, { icon: IconType; color: string }> = {
  whatsapp: { icon: FaWhatsapp, color: "#25D366" },
  instagram: { icon: FaInstagram, color: "#E1306C" },
  telegram: { icon: FaTelegramPlane, color: "#0088cc" },
};

interface ChatItem {
  id: string;
  name: string;
  lastMsg: string;
  time: string;
  unread: boolean;
  platform: string;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

interface Props {
  selectedPatientId: string | null;
  onSelectPatient: (id: string) => void;
}

export function ActiveChats({ selectedPatientId, onSelectPatient }: Props) {
  const { t } = useTranslation();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const { data: patients } = await supabase
        .from("patients")
        .select("id, name, platform")
        .order("updated_at", { ascending: false });

      if (!patients || !isMounted) return;

      const latestMessages = await Promise.all(
        patients.map(async (patient) => {
          const { data: msgs } = await supabase
            .from("messages")
            .select("text, created_at, sender_type")
            .eq("patient_id", patient.id)
            .order("created_at", { ascending: false })
            .limit(1);
          return { patient, lastMsg: msgs?.[0] };
        })
      );

      const chatItems: ChatItem[] = latestMessages.map(({ patient, lastMsg }) => ({
        id: patient.id,
        name: patient.name,
        lastMsg: lastMsg?.text
          ? `${lastMsg.text.substring(0, 40)}${lastMsg.text.length > 40 ? "..." : ""}`
          : "No messages",
        time: lastMsg ? formatTime(lastMsg.created_at) : "",
        unread: lastMsg?.sender_type === "patient",
        platform: patient.platform || "whatsapp",
      }));

      setChats(chatItems);
    }

    load();

    const channel = supabase
      .channel("sidebar-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, load)
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = search
    ? chats.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : chats;

  const deleteChat = async (e: React.MouseEvent, patientId: string, patientName: string) => {
    e.stopPropagation();
    if (!confirm(`"${patientName}" ile olan tüm konuşma ve hasta kaydı silinecek. Emin misiniz?`)) return;
    // Cascade delete: messages → patient
    const { error: mErr } = await supabase.from("messages").delete().eq("patient_id", patientId);
    if (mErr) { toast.error("Mesajlar silinemedi: " + mErr.message); return; }
    const { error: pErr } = await supabase.from("patients").delete().eq("id", patientId);
    if (pErr) { toast.error("Hasta silinemedi: " + pErr.message); return; }
    toast.success("Konuşma silindi");
    if (selectedPatientId === patientId) onSelectPatient("");
    setChats(prev => prev.filter(c => c.id !== patientId));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search */}
      <div className="px-3 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("inbox.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-muted/50 border-0"
          />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filtered.map((chat) => (
          <div
            key={chat.id}
            className={`group relative w-full flex items-start gap-3 px-4 py-3 text-left transition-all duration-150 border-b border-border/50 cursor-pointer
              ${chat.id === selectedPatientId ? "bg-primary/5" : "hover:bg-accent/50"}`}
            onClick={() => onSelectPatient(chat.id)}
          >
            <div className="relative flex-shrink-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold
                ${chat.id === selectedPatientId ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                {chat.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              {chat.unread && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary border-2 border-card" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className={`text-[13px] truncate ${chat.unread ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
                  {chat.name}
                </span>
                <span className="text-[11px] text-muted-foreground flex-shrink-0">{chat.time}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {(() => {
                  const cfg = platformConfig[chat.platform];
                  if (cfg) {
                    const Icon = cfg.icon;
                    return <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: cfg.color }} />;
                  }
                  return <Globe className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />;
                })()}
                <span className={`text-[12px] truncate ${chat.unread ? "text-foreground/70 font-medium" : "text-muted-foreground"}`}>
                  {chat.lastMsg}
                </span>
              </div>
            </div>

            <button
              onClick={(e) => deleteChat(e, chat.id, chat.name)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-card/80 backdrop-blur opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all"
              title="Konuşmayı sil"
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

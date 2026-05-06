import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WidgetSettings {
  clinic_name: string;
  welcome_message: string;
  primary_color: string;
  logo_url: string | null;
  is_active: boolean;
  ask_phone: boolean;
}

interface ChatMsg {
  id: string;
  sender_type: "patient" | "admin" | "ai" | string;
  text: string;
  created_at: string;
}

const SESSION_KEY = "clinix_widget_session";
const NAME_KEY = "clinix_widget_name";
const PHONE_KEY = "clinix_widget_phone";

function getOrCreateSession(): string {
  let s = localStorage.getItem(SESSION_KEY);
  if (!s) {
    s = "web_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, s);
  }
  return s;
}

export default function Widget() {
  const [settings, setSettings] = useState<WidgetSettings | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) || "");
  const [phone, setPhone] = useState(() => localStorage.getItem(PHONE_KEY) || "");
  const [needsContact, setNeedsContact] = useState(false);
  const [sending, setSending] = useState(false);
  const sessionId = useRef(getOrCreateSession());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load settings + initial messages
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("widget_settings")
        .select("clinic_name, welcome_message, primary_color, logo_url, is_active, ask_phone")
        .limit(1)
        .maybeSingle();

      if (data) {
        setSettings(data as WidgetSettings);
        if (data.ask_phone && !localStorage.getItem(NAME_KEY)) {
          setNeedsContact(true);
        }
      } else {
        setSettings({
          clinic_name: "Clinix",
          welcome_message: "Merhaba! Size nasıl yardımcı olabiliriz?",
          primary_color: "#0F172A",
          logo_url: null,
          is_active: true,
          ask_phone: true,
        });
      }
      await fetchReplies();
    })();
  }, []);

  // Poll for replies every 5s
  useEffect(() => {
    const t = setInterval(fetchReplies, 5000);
    return () => clearInterval(t);
  }, []);

  // Auto scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function fetchReplies() {
    try {
      const url = `https://czqhorgsutnadznkibkb.supabase.co/functions/v1/widget-replies?session_id=${encodeURIComponent(sessionId.current)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (Array.isArray(json.messages)) setMessages(json.messages);
    } catch {}
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    if (settings?.ask_phone) {
      const digits = phone.replace(/\D/g, "");
      if (!name.trim() || digits.length < 10) {
        setNeedsContact(true);
        return;
      }
    }

    setSending(true);
    // Optimistic
    const optimistic: ChatMsg = {
      id: "tmp_" + Date.now(),
      sender_type: "patient",
      text,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setInput("");

    try {
      const url = `https://czqhorgsutnadznkibkb.supabase.co/functions/v1/widget-message`;
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId.current,
          name: name || "Web Ziyaretçi",
          phone,
          message: text,
        }),
      });
      await fetchReplies();
    } catch (e) {
      // rollback
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  function saveContact() {
    const digits = phone.replace(/\D/g, "");
    if (!name.trim() || digits.length < 10) return;
    localStorage.setItem(NAME_KEY, name.trim());
    localStorage.setItem(PHONE_KEY, digits);
    setPhone(digits);
    setNeedsContact(false);
  }

  if (!settings) {
    return <div style={{ padding: 20, fontFamily: "system-ui" }}>Yükleniyor…</div>;
  }

  if (!settings.is_active) {
    return (
      <div style={{ padding: 24, textAlign: "center", fontFamily: "system-ui", color: "#64748B" }}>
        Sohbet şu an devre dışı.
      </div>
    );
  }

  const color = settings.primary_color || "#0F172A";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        background: "#fff",
      }}
    >
      {/* Header */}
      <div style={{ background: color, color: "#fff", padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
        {settings.logo_url ? (
          <img src={settings.logo_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
            {settings.clinic_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{settings.clinic_name}</div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>Genelde birkaç dakika içinde yanıtlarız</div>
        </div>
      </div>

      {/* Body */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, background: "#F8FAFC" }}>
        {/* Welcome bubble */}
        <Bubble side="left" color={color}>{settings.welcome_message}</Bubble>

        {messages.map((m) => (
          <Bubble key={m.id} side={m.sender_type === "patient" ? "right" : "left"} color={color}>
            {m.text}
          </Bubble>
        ))}

        {needsContact && (
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 14, marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#0F172A" }}>Sohbete başlamak için</div>
            <input
              placeholder="Adınız *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              maxLength={80}
            />
            <input
              placeholder="Telefon * (en az 10 hane)"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 15))}
              inputMode="numeric"
              type="tel"
              style={{ ...inputStyle, marginTop: 8 }}
              maxLength={15}
            />
            <button
              onClick={saveContact}
              disabled={!name.trim() || phone.replace(/\D/g, "").length < 10}
              style={{
                marginTop: 10, width: "100%", background: color, color: "#fff",
                border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600,
                cursor: (name.trim() && phone.replace(/\D/g, "").length >= 10) ? "pointer" : "not-allowed",
                opacity: (name.trim() && phone.replace(/\D/g, "").length >= 10) ? 1 : 0.5,
              }}
            >
              Devam Et
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #E2E8F0", padding: 12, display: "flex", gap: 8, background: "#fff" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Mesajınızı yazın…"
          maxLength={2000}
          style={{ ...inputStyle, flex: 1, marginTop: 0 }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          style={{
            background: color, color: "#fff", border: "none", borderRadius: 10,
            padding: "0 16px", fontWeight: 600, cursor: input.trim() ? "pointer" : "not-allowed",
            opacity: input.trim() ? 1 : 0.5,
          }}
        >
          Gönder
        </button>
      </div>
      <div style={{ textAlign: "center", padding: "6px 0 10px", fontSize: 10, color: "#94A3B8", background: "#fff" }}>
        Powered by <strong style={{ color: "#0F172A" }}>Clinix</strong>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #E2E8F0",
  fontSize: 13,
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

function Bubble({ side, color, children }: { side: "left" | "right"; color: string; children: React.ReactNode }) {
  const isRight = side === "right";
  return (
    <div style={{ display: "flex", justifyContent: isRight ? "flex-end" : "flex-start", marginBottom: 8 }}>
      <div
        style={{
          maxWidth: "78%",
          background: isRight ? color : "#fff",
          color: isRight ? "#fff" : "#0F172A",
          padding: "10px 13px",
          borderRadius: 14,
          borderTopRightRadius: isRight ? 4 : 14,
          borderTopLeftRadius: isRight ? 14 : 4,
          fontSize: 13.5,
          lineHeight: 1.45,
          boxShadow: isRight ? "none" : "0 1px 2px rgba(15,23,42,.06)",
          border: isRight ? "none" : "1px solid #E2E8F0",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {children}
      </div>
    </div>
  );
}

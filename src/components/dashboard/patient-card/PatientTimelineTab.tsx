import { motion } from "framer-motion";
import { MessageSquare, CalendarCheck, FileText, CheckCircle, Bot, Phone, Stethoscope } from "lucide-react";

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: "ai" | "appointment" | "report" | "call" | "exam" | "completed";
}

const MOCK_TIMELINE: TimelineEvent[] = [
  { id: "1", date: "2026-03-10", title: "AI Karşılama", description: "Hasta WhatsApp üzerinden ilk mesajını gönderdi. AI asistan otomatik karşılama yaptı.", type: "ai" },
  { id: "2", date: "2026-03-11", title: "Randevu Talebi", description: "Hasta diş ağrısı şikayetiyle randevu talep etti.", type: "appointment" },
  { id: "3", date: "2026-03-13", title: "Telefon Görüşmesi", description: "Sekreter hasta ile telefonla görüşerek randevu saatini onayladı.", type: "call" },
  { id: "4", date: "2026-03-15", title: "Klinik Muayenesi", description: "Dr. Yılmaz tarafından genel muayene yapıldı. Panoramik röntgen istendi.", type: "exam" },
  { id: "5", date: "2026-03-16", title: "Rapor Yüklendi", description: "Panoramik röntgen sonucu sisteme yüklendi.", type: "report" },
  { id: "6", date: "2026-03-20", title: "Tedavi Tamamlandı", description: "Dolgulama işlemi başarıyla tamamlandı. Kontrol randevusu planlandı.", type: "completed" },
];

const TYPE_CONFIG: Record<TimelineEvent["type"], { icon: typeof Bot; color: string; bg: string }> = {
  ai: { icon: Bot, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  appointment: { icon: CalendarCheck, color: "text-warning", bg: "bg-warning/10 border-warning/20" },
  report: { icon: FileText, color: "text-accent-foreground", bg: "bg-accent border-border" },
  call: { icon: Phone, color: "text-success", bg: "bg-success/10 border-success/20" },
  exam: { icon: Stethoscope, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  completed: { icon: CheckCircle, color: "text-success", bg: "bg-success/10 border-success/20" },
};

export function PatientTimelineTab() {
  return (
    <div className="p-1">
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border" />

        <div className="space-y-0">
          {MOCK_TIMELINE.map((event, index) => {
            const config = TYPE_CONFIG[event.type];
            const Icon = config.icon;
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.07, duration: 0.3 }}
                className="relative flex gap-3.5 pb-6 last:pb-0"
              >
                {/* Node */}
                <div className={`relative z-10 w-10 h-10 rounded-xl border ${config.bg} flex items-center justify-center shrink-0 shadow-sm`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-[13px] font-semibold text-foreground">{event.title}</h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mb-1">{event.description}</p>
                  <span className="text-[10px] text-muted-foreground/60 font-mono">
                    {new Date(event.date).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

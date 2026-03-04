const appointments = [
  { time: "09:00", patient: "Emre Aydın", doctor: "Dr. Öztürk", type: "Follow-up", status: "completed" },
  { time: "10:30", patient: "Selin Kara", doctor: "Dr. Yılmaz", type: "Consultation", status: "completed" },
  { time: "11:30", patient: "Murat Şahin", doctor: "Dr. Öztürk", type: "Check-up", status: "in-progress" },
  { time: "14:30", patient: "Büşra Zeydan", doctor: "Dr. Öztürk", type: "Ortho Visit", status: "pending" },
  { time: "15:00", patient: "Deniz Koç", doctor: "Dr. Yılmaz", type: "X-Ray Review", status: "upcoming" },
  { time: "16:30", patient: "Elif Tunç", doctor: "Dr. Öztürk", type: "Follow-up", status: "upcoming" },
];

const statusStyles: Record<string, { dot: string; text: string }> = {
  completed: { dot: "bg-success/40", text: "text-muted-foreground line-through" },
  "in-progress": { dot: "bg-primary animate-pulse-soft", text: "text-foreground font-medium" },
  pending: { dot: "bg-warning", text: "text-foreground font-medium" },
  upcoming: { dot: "bg-muted-foreground/30", text: "text-muted-foreground" },
};

export function MiniSchedule() {
  return (
    <div className="space-y-1">
      {appointments.map((apt, i) => {
        const s = statusStyles[apt.status];
        return (
          <div
            key={i}
            className={`flex items-start gap-3 px-3 py-2 rounded-lg transition-colors
              ${apt.status === "pending" ? "bg-warning/5 border border-warning/15" : "hover:bg-accent"}`}
          >
            {/* Timeline */}
            <div className="flex flex-col items-center pt-1">
              <div className={`w-2 h-2 rounded-full ${s.dot}`} />
              {i < appointments.length - 1 && <div className="w-px h-6 bg-border mt-1" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-[12px] ${s.text}`}>{apt.patient}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{apt.time}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{apt.doctor} · {apt.type}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

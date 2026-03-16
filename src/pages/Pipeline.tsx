import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

interface Patient {
  id: string;
  name: string;
  platform: string | null;
  status: string;
  complaint: string | null;
  created_at: string;
}

interface PipelineCard {
  id: string;
  name: string;
  value: number;
  priority: "urgent" | "medium" | "low";
  platform: string | null;
  date: string;
}

const platformIcon: Record<string, string> = {
  whatsapp: "🟢",
  telegram: "✈️",
  instagram: "🟣",
};

const priorityStyles: Record<string, { bg: string; text: string }> = {
  urgent: { bg: "bg-destructive/10", text: "text-destructive" },
  medium: { bg: "bg-warning/10", text: "text-warning" },
  low: { bg: "bg-primary/10", text: "text-primary" },
};

const Pipeline = () => {
  const { t } = useTranslation();
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("patients")
        .select("id, name, platform, status, complaint, created_at")
        .order("updated_at", { ascending: false });
      if (data) setPatients(data);
    }
    load();
  }, []);

  // Map patients to pipeline stages based on status
  const columns = useMemo(() => {
    const stages: Record<string, PipelineCard[]> = {
      incoming: [],
      aiScan: [],
      awaitingApproval: [],
      appointmentBooked: [],
    };

    patients.forEach((p, i) => {
      const card: PipelineCard = {
        id: p.id,
        name: p.name,
        value: Math.floor(Math.random() * 20000) + 3000,
        priority: i % 3 === 0 ? "urgent" : i % 3 === 1 ? "medium" : "low",
        platform: p.platform,
        date: new Date(p.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" }),
      };

      if (p.status === "pending") stages.incoming.push(card);
      else if (p.status === "active") stages.aiScan.push(card);
      else if (p.status === "approved" || p.status === "rescheduled") stages.awaitingApproval.push(card);
      else stages.appointmentBooked.push(card);
    });

    return stages;
  }, [patients]);

  const columnDefs = [
    { key: "incoming", labelKey: "pipeline.incoming" },
    { key: "aiScan", labelKey: "pipeline.aiScan" },
    { key: "awaitingApproval", labelKey: "pipeline.awaitingApproval" },
    { key: "appointmentBooked", labelKey: "pipeline.appointmentBooked" },
  ];

  const totalValue = (cards: PipelineCard[]) =>
    cards.reduce((sum, c) => sum + c.value, 0).toLocaleString("tr-TR");

  return (
    <div className="p-6 md:p-8 space-y-6 h-full overflow-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">{t("pipeline.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("pipeline.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columnDefs.map((col) => {
          const cards = columns[col.key] || [];
          return (
            <div key={col.key} className="bg-muted/50 rounded-xl p-3 min-h-[400px]">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{t(col.labelKey)}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {cards.length} {t("pipeline.lead")} · {totalValue(cards)} ₺
                  </p>
                </div>
                {cards.length > 0 && (
                  <span className="min-w-[22px] h-[22px] flex items-center justify-center rounded-full bg-muted text-muted-foreground text-[11px] font-bold">
                    {cards.length}
                  </span>
                )}
              </div>

              {/* Cards */}
              <div className="space-y-2.5">
                {cards.map((card) => {
                  const pStyle = priorityStyles[card.priority];
                  return (
                    <div
                      key={card.id}
                      className="bg-card rounded-xl border border-border p-4 shadow-card hover:shadow-elevated transition-shadow cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-foreground">{card.name}</span>
                        <span className="text-sm">{card.platform ? platformIcon[card.platform] || "🌐" : "🌐"}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-primary">{card.value.toLocaleString("tr-TR")} ₺</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pStyle.bg} ${pStyle.text}`}>
                          {t(`pipeline.${card.priority}`)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{card.date}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Pipeline;

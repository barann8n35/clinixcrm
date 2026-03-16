import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { FaWhatsapp, FaInstagram, FaTelegramPlane } from "react-icons/fa";
import { GripVertical } from "lucide-react";
import { IconType } from "react-icons";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";

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

const platformConfig: Record<string, { icon: IconType; color: string }> = {
  whatsapp: { icon: FaWhatsapp, color: "#25D366" },
  instagram: { icon: FaInstagram, color: "#E1306C" },
  telegram: { icon: FaTelegramPlane, color: "#0088cc" },
};

const priorityStyles: Record<string, { bg: string; text: string }> = {
  urgent: { bg: "bg-destructive/10", text: "text-destructive" },
  medium: { bg: "bg-warning/10", text: "text-warning" },
  low: { bg: "bg-primary/10", text: "text-primary" },
};

const columnKeys = ["incoming", "aiScan", "awaitingApproval", "appointmentBooked"] as const;
type ColumnKey = (typeof columnKeys)[number];

const statusForColumn: Record<ColumnKey, string> = {
  incoming: "pending",
  aiScan: "active",
  awaitingApproval: "approved",
  appointmentBooked: "completed",
};

const columnForStatus = (status: string): ColumnKey => {
  if (status === "pending") return "incoming";
  if (status === "active") return "aiScan";
  if (status === "approved" || status === "rescheduled") return "awaitingApproval";
  return "appointmentBooked";
};

const Pipeline = () => {
  const { t } = useTranslation();
  const [columns, setColumns] = useState<Record<ColumnKey, PipelineCard[]>>({
    incoming: [],
    aiScan: [],
    awaitingApproval: [],
    appointmentBooked: [],
  });
  const valuesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("patients")
        .select("id, name, platform, status, complaint, created_at")
        .order("updated_at", { ascending: false });
      if (!data) return;

      const stages: Record<ColumnKey, PipelineCard[]> = {
        incoming: [],
        aiScan: [],
        awaitingApproval: [],
        appointmentBooked: [],
      };

      data.forEach((p, i) => {
        if (!valuesRef.current[p.id]) {
          valuesRef.current[p.id] = Math.floor(Math.random() * 20000) + 3000;
        }
        const card: PipelineCard = {
          id: p.id,
          name: p.name,
          value: valuesRef.current[p.id],
          priority: i % 3 === 0 ? "urgent" : i % 3 === 1 ? "medium" : "low",
          platform: p.platform,
          date: new Date(p.created_at).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        };
        const col = columnForStatus(p.status);
        stages[col].push(card);
      });

      setColumns(stages);
    }
    load();
  }, []);

  const onDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination } = result;
      if (!destination) return;
      if (source.droppableId === destination.droppableId && source.index === destination.index) return;

      const srcKey = source.droppableId as ColumnKey;
      const dstKey = destination.droppableId as ColumnKey;

      setColumns((prev) => {
        const srcCards = [...prev[srcKey]];
        const [moved] = srcCards.splice(source.index, 1);

        if (srcKey === dstKey) {
          srcCards.splice(destination.index, 0, moved);
          return { ...prev, [srcKey]: srcCards };
        }

        const dstCards = [...prev[dstKey]];
        dstCards.splice(destination.index, 0, moved);

        // Fire-and-forget Supabase update
        supabase
          .from("patients")
          .update({ status: statusForColumn[dstKey] })
          .eq("id", moved.id)
          .then();

        return { ...prev, [srcKey]: srcCards, [dstKey]: dstCards };
      });
    },
    []
  );

  const columnDefs: { key: ColumnKey; labelKey: string }[] = [
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
        <h1 className="text-2xl font-display font-bold text-foreground">
          {t("pipeline.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("pipeline.subtitle")}</p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {columnDefs.map((col) => {
            const cards = columns[col.key] || [];
            return (
              <div key={col.key} className="bg-muted/50 rounded-xl p-3 min-h-[400px]">
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {t(col.labelKey)}
                    </h3>
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

                <Droppable droppableId={col.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2.5 min-h-[60px] rounded-lg transition-colors ${
                        snapshot.isDraggingOver ? "bg-primary/5 ring-2 ring-primary/20" : ""
                      }`}
                    >
                      {cards.map((card, index) => {
                        const pStyle = priorityStyles[card.priority];
                        return (
                          <Draggable key={card.id} draggableId={card.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`bg-card rounded-xl border border-border p-4 shadow-card transition-shadow ${
                                  snapshot.isDragging
                                    ? "shadow-elevated ring-2 ring-primary/30 rotate-1"
                                    : "hover:shadow-elevated"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span
                                      {...provided.dragHandleProps}
                                      className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </span>
                                    <span className="text-sm font-semibold text-foreground">
                                      {card.name}
                                    </span>
                                  </div>
                                  {(() => {
                                    const cfg = card.platform
                                      ? platformConfig[card.platform]
                                      : null;
                                    if (cfg) {
                                      const Icon = cfg.icon;
                                      return (
                                        <Icon
                                          className="w-4 h-4 shrink-0"
                                          style={{ color: cfg.color }}
                                        />
                                      );
                                    }
                                    return <span className="text-sm">🌐</span>;
                                  })()}
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-bold text-primary">
                                    {card.value.toLocaleString("tr-TR")} ₺
                                  </span>
                                  <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pStyle.bg} ${pStyle.text}`}
                                  >
                                    {t(`pipeline.${card.priority}`)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">{card.date}</p>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};

export default Pipeline;

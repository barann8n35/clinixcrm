import * as React from "react";
import { useState } from "react";
import { Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8..20
const QUICK_MINUTES = [0, 15, 30, 45];

interface TimePickerProps {
  value: string; // "HH:mm"
  onChange: (value: string) => void;
  className?: string;
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [h, m] = value.split(":").map(Number);

  const pad = (n: number) => String(n).padStart(2, "0");

  const handleHourClick = (hour: number) => {
    setSelectedHour(hour);
  };

  const handleMinuteClick = (min: number) => {
    const hour = selectedHour ?? h;
    onChange(`${pad(hour)}:${pad(min)}`);
    setSelectedHour(null);
    setOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSelectedHour(null);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 px-2.5 rounded-lg text-[11px] font-medium gap-1.5 min-w-[80px] justify-start",
            className
          )}
        >
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          {pad(h)}:{pad(m)}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-3 rounded-xl pointer-events-auto"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        {/* Hour grid */}
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">
          Saat
        </p>
        <div className="grid grid-cols-5 gap-1.5">
          {HOURS.map((hour) => (
            <button
              key={hour}
              onClick={() => handleHourClick(hour)}
              className={cn(
                "h-9 w-11 rounded-lg text-xs font-semibold transition-all duration-150",
                "hover:bg-primary/10 hover:text-primary active:scale-95",
                (selectedHour ?? h) === hour
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-foreground"
              )}
            >
              {pad(hour)}
            </button>
          ))}
        </div>

        {/* Minute quick blocks */}
        <div className="mt-2.5 pt-2.5 border-t border-border/60">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">
            Dakika
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {QUICK_MINUTES.map((qm) => (
              <button
                key={qm}
                onClick={() => handleMinuteClick(qm)}
                className={cn(
                  "h-9 rounded-lg text-xs font-semibold transition-all duration-150",
                  "hover:bg-primary/10 hover:text-primary active:scale-95",
                  selectedHour == null && m === qm
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-foreground"
                )}
              >
                :{pad(qm)}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Clock, ChevronUp, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const QUICK_MINUTES = [0, 15, 30, 45];

interface TimePickerProps {
  value: string; // "HH:mm"
  onChange: (value: string) => void;
  className?: string;
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [h, m] = value.split(":").map(Number);

  const pad = (n: number) => String(n).padStart(2, "0");

  const set = (hour: number, min: number) => {
    onChange(`${pad(((hour % 24) + 24) % 24)}:${pad(((min % 60) + 60) % 60)}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
        <div className="flex items-center gap-3">
          {/* Hour spinner */}
          <Spinner value={h} max={23} onChange={(v) => set(v, m)} label="Saat" />

          <span className="text-lg font-bold text-muted-foreground select-none pb-5">:</span>

          {/* Minute spinner */}
          <Spinner value={m} max={59} onChange={(v) => set(h, v)} label="Dakika" />
        </div>

        {/* Quick minute buttons */}
        <div className="mt-2.5 pt-2.5 border-t border-border/60">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">
            Hızlı Dakika
          </p>
          <div className="flex gap-1.5">
            {QUICK_MINUTES.map((qm) => (
              <button
                key={qm}
                onClick={() => { set(h, qm); setOpen(false); }}
                className={cn(
                  "flex-1 h-7 rounded-lg text-[11px] font-semibold transition-all duration-150",
                  "hover:bg-primary/10 hover:text-primary active:scale-95",
                  m === qm
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

function Spinner({ value, max, onChange, label }: { value: number; max: number; onChange: (v: number) => void; label: string }) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const step = (dir: 1 | -1) => {
    onChange(((value + dir) % (max + 1) + (max + 1)) % (max + 1));
  };

  const startHold = (dir: 1 | -1) => {
    step(dir);
    const timeout = setTimeout(() => {
      intervalRef.current = setInterval(() => step(dir), 100);
    }, 400);
    intervalRef.current = timeout as any;
  };

  const stopHold = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => () => stopHold(), []);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">{label}</p>
      <button
        onMouseDown={() => startHold(1)}
        onMouseUp={stopHold}
        onMouseLeave={stopHold}
        onTouchStart={() => startHold(1)}
        onTouchEnd={stopHold}
        className="w-10 h-7 flex items-center justify-center rounded-lg hover:bg-accent active:scale-90 transition-all duration-150 text-muted-foreground hover:text-foreground"
      >
        <ChevronUp className="w-4 h-4" />
      </button>
      <div className="w-12 h-10 flex items-center justify-center rounded-xl bg-muted/60 border border-border/60 text-lg font-bold tabular-nums select-none">
        {pad(value)}
      </div>
      <button
        onMouseDown={() => startHold(-1)}
        onMouseUp={stopHold}
        onMouseLeave={stopHold}
        onTouchStart={() => startHold(-1)}
        onTouchEnd={stopHold}
        className="w-10 h-7 flex items-center justify-center rounded-lg hover:bg-accent active:scale-90 transition-all duration-150 text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  );
}

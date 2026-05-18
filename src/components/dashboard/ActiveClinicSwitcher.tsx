import { Building2, Check, ChevronDown } from "lucide-react";
import { useActiveClinic } from "@/contexts/ActiveClinicContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function ActiveClinicSwitcher() {
  const { options, activeClinicUserId, setActiveClinicUserId, hasMultiple, loading } = useActiveClinic();

  if (loading || !hasMultiple) return null;

  const active = options.find((o) => o.ownerUserId === activeClinicUserId);
  const shortName = active?.ownerName.split(" ").slice(0, 2).join(" ") || "Klinik";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-1.5",
            "text-xs font-semibold text-foreground shadow-sm",
            "transition-all duration-200 hover:scale-105 active:scale-95 hover:bg-muted/50"
          )}
        >
          <Building2 className="w-3.5 h-3.5 text-primary" />
          <span className="hidden sm:inline text-muted-foreground font-normal">Aktif:</span>
          <span className="max-w-[120px] truncate">{shortName}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Klinik seçin
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((o) => {
          const isActive = o.ownerUserId === activeClinicUserId;
          return (
            <DropdownMenuItem
              key={o.ownerUserId}
              onClick={() => setActiveClinicUserId(o.ownerUserId)}
              className="flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">{o.ownerName}</span>
                <span className="text-[10px] text-muted-foreground capitalize">
                  {o.memberRole === "self" ? "Kendi kliniğim" : o.memberRole}
                </span>
              </div>
              {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

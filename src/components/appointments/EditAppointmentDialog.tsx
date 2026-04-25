import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarIcon, Pencil, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

const timeSlots = Array.from({ length: 28 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const min = i % 2 === 0 ? "00" : "30";
  return `${String(hour).padStart(2, "0")}:${min}`;
});

interface EditAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  currentDate: Date;
  currentTime: string;
  currentType: string;
  onUpdated: () => void;
}

const EditAppointmentDialog = ({
  open,
  onOpenChange,
  appointmentId,
  currentDate,
  currentTime,
  currentType,
  onUpdated,
}: EditAppointmentDialogProps) => {
  const isMobile = useIsMobile();
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState<Date | undefined>(currentDate);
  const [time, setTime] = useState(currentTime);
  const [type, setType] = useState(currentType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) {
      toast.error("Tarih ve saat seçiniz.");
      return;
    }
    setSaving(true);
    try {
      const [h, m] = time.split(":");
      const scheduledAt = new Date(date);
      scheduledAt.setHours(parseInt(h), parseInt(m), 0, 0);

      const { error } = await supabase
        .from("appointments")
        .update({
          scheduled_at: scheduledAt.toISOString(),
          type,
        })
        .eq("id", appointmentId);

      if (error) throw error;
      toast.success("Randevu güncellendi ✓");
      onOpenChange(false);
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Güncelleme başarısız.");
    } finally {
      setSaving(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label>Randevu Türü</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Ön Muayene">Ön Muayene</SelectItem>
            <SelectItem value="Muayene">Muayene</SelectItem>
            <SelectItem value="Kontrol">Kontrol</SelectItem>
            <SelectItem value="Operasyon">Operasyon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tarih</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "d MMM yyyy", { locale: tr }) : "Seçin"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label>Saat</Label>
          <Select value={time} onValueChange={setTime}>
            <SelectTrigger>
              <SelectValue placeholder="Seçin" />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Güncelleniyor...</> : "Randevuyu Güncelle"}
      </Button>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Randevuyu Düzenle</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">{formContent}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Randevuyu Düzenle</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
};

export default EditAppointmentDialog;

import { FileText, Inbox } from "lucide-react";

export function PatientFilesTab() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
        <Inbox className="w-6 h-6 text-muted-foreground/30" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">Henüz dosya yüklenmedi</p>
      <p className="text-xs text-muted-foreground/60 mt-1">Hasta dosyaları burada görünecek</p>
    </div>
  );
}

import { motion } from "framer-motion";
import { FileText, FileImage, Download, Eye, File, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PatientFile {
  id: string;
  name: string;
  type: "xray" | "lab" | "report" | "image" | "other";
  date: string;
  size: string;
}

const MOCK_FILES: PatientFile[] = [
  { id: "1", name: "Panoramik_Rontgen.dcm", type: "xray", date: "2026-03-16", size: "4.2 MB" },
  { id: "2", name: "Kan_Tahlili_Sonuclari.pdf", type: "lab", date: "2026-03-14", size: "280 KB" },
  { id: "3", name: "Tedavi_Plani_Raporu.pdf", type: "report", date: "2026-03-17", size: "1.1 MB" },
  { id: "4", name: "Agiz_Ici_Fotograf.jpg", type: "image", date: "2026-03-15", size: "2.8 MB" },
  { id: "5", name: "MR_Sonucu.dcm", type: "xray", date: "2026-03-20", size: "8.5 MB" },
  { id: "6", name: "Reçete.pdf", type: "other", date: "2026-03-21", size: "95 KB" },
];

const FILE_CONFIG: Record<PatientFile["type"], { icon: typeof FileText; color: string; bg: string; label: string }> = {
  xray: { icon: FileImage, color: "text-primary", bg: "bg-primary/10", label: "Röntgen" },
  lab: { icon: FileText, color: "text-success", bg: "bg-success/10", label: "Tahlil" },
  report: { icon: File, color: "text-warning", bg: "bg-warning/10", label: "Rapor" },
  image: { icon: FileImage, color: "text-accent-foreground", bg: "bg-accent", label: "Görsel" },
  other: { icon: File, color: "text-muted-foreground", bg: "bg-muted", label: "Diğer" },
};

export function PatientFilesTab() {
  function handlePreview(file: PatientFile) {
    toast.info(`"${file.name}" önizleniyor...`);
  }

  function handleDownload(file: PatientFile) {
    toast.success(`"${file.name}" indiriliyor...`);
  }

  return (
    <div className="p-1 space-y-2.5">
      {MOCK_FILES.map((file, index) => {
        const config = FILE_CONFIG[file.type];
        const Icon = config.icon;
        return (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.25 }}
            className="group rounded-2xl border border-border bg-card p-3.5 hover:shadow-card transition-all duration-200"
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-[13px] font-semibold text-foreground truncate">{file.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                    {config.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(file.date).toLocaleDateString("tr-TR")}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{file.size}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(file)}>
                  <Eye className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(file)}>
                  <Download className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

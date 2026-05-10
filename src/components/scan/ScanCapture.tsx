import { useRef, useState } from "react";
import { Camera, Upload, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onScan: (images: string[]) => Promise<void>;
  loading: boolean;
}

export function ScanCapture({ onScan, loading }: Props) {
  const [images, setImages] = useState<string[]>([]);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function addFiles(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).slice(0, 5 - images.length);
    const dataUrls = await Promise.all(arr.map(toDataURL));
    setImages((prev) => [...prev, ...dataUrls].slice(0, 5));
  }

  function toDataURL(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => cameraRef.current?.click()}
          disabled={loading || images.length >= 5}
          className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all p-6 flex flex-col items-center gap-2 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
        >
          <Camera className="w-8 h-8 text-primary" />
          <span className="text-[13px] font-semibold text-foreground">Fotoğraf Çek</span>
          <span className="text-[10px] text-muted-foreground">Tüm sayfayı çekin</span>
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading || images.length >= 5}
          className="rounded-2xl border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-all p-6 flex flex-col items-center gap-2 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
        >
          <Upload className="w-8 h-8 text-foreground/70" />
          <span className="text-[13px] font-semibold text-foreground">Galeriden Yükle</span>
          <span className="text-[10px] text-muted-foreground">5 sayfaya kadar — 10+ hasta</span>
        </button>
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => addFiles(e.target.files)} />
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />

      <AnimatePresence>
        {images.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-3 gap-2">
            {images.map((src, i) => (
              <div key={i} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-border bg-muted">
                <img src={src} alt={`scan-${i}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  disabled={loading}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {images.length > 0 && (
        <Button
          onClick={() => onScan(images)}
          disabled={loading}
          className="w-full h-12 rounded-2xl text-[14px] font-bold bg-gradient-to-r from-primary to-primary/80 hover:scale-[1.01] active:scale-95 transition-all"
        >
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI okuyor...</> : <><Sparkles className="w-4 h-4 mr-2" />Notu Çıkar</>}
        </Button>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Plus, Minus, AlertTriangle, Search, History, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  current_stock: number;
  critical_level: number;
  unit: string;
}

interface InventoryLog {
  id: string;
  item_id: string;
  change_amount: number;
  reason: string | null;
  created_at: string;
  item_name?: string;
}

const CATEGORIES = ["Medikal", "İlaç", "Ofis", "Laboratuvar", "Diğer"];

const Inventory = () => {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useRole();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [stockChangeItem, setStockChangeItem] = useState<InventoryItem | null>(null);
  const [changeAmount, setChangeAmount] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [newItem, setNewItem] = useState({ name: "", category: "Medikal", critical_level: "5", unit: "adet" });
  const [saving, setSaving] = useState(false);

  async function fetchData() {
    setLoading(true);
    const [itemsRes, logsRes] = await Promise.all([
      supabase.from("inventory_items").select("*").order("name"),
      supabase.from("inventory_logs").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setItems((itemsRes.data as any[]) || []);
    setLogs((logsRes.data as any[]) || []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() =>
    items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())),
  [items, search]);

  const criticalItems = useMemo(() =>
    items.filter(i => i.current_stock <= i.critical_level),
  [items]);

  async function handleAddItem() {
    if (!newItem.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("inventory_items").insert({
      name: newItem.name.trim(),
      category: newItem.category,
      critical_level: parseInt(newItem.critical_level) || 5,
      unit: newItem.unit,
      current_stock: 0,
    });
    setSaving(false);
    if (error) { toast.error("Ürün eklenemedi: " + error.message); return; }
    toast.success("Ürün eklendi!");
    setShowAddDialog(false);
    setNewItem({ name: "", category: "Medikal", critical_level: "5", unit: "adet" });
    fetchData();
  }

  async function handleStockChange(type: "add" | "remove") {
    if (!stockChangeItem || !changeAmount) return;
    const amount = parseInt(changeAmount);
    if (isNaN(amount) || amount <= 0) return;
    const delta = type === "add" ? amount : -amount;
    const newStock = stockChangeItem.current_stock + delta;
    if (newStock < 0) { toast.error("Stok negatif olamaz"); return; }

    setSaving(true);
    const { error: updateErr } = await supabase
      .from("inventory_items")
      .update({ current_stock: newStock })
      .eq("id", stockChangeItem.id);
    if (updateErr) { toast.error("Güncelleme hatası"); setSaving(false); return; }

    await supabase.from("inventory_logs").insert({
      item_id: stockChangeItem.id,
      change_amount: delta,
      reason: changeReason || (type === "add" ? "Stok girişi" : "Stok çıkışı"),
      created_by: user?.id,
    });

    setSaving(false);
    toast.success(`Stok ${type === "add" ? "eklendi" : "çıkarıldı"}`);
    setStockChangeItem(null);
    setChangeAmount("");
    setChangeReason("");
    fetchData();
  }

  const logsWithNames = useMemo(() => {
    const itemMap = new Map(items.map(i => [i.id, i.name]));
    return logs.map(l => ({ ...l, item_name: itemMap.get(l.item_id) || "—" }));
  }, [logs, items]);

  if (roleLoading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground mb-2">Erişim Reddedildi</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Stok Takibi modülüne yalnızca admin yetkisine sahip kullanıcılar erişebilir.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 h-full overflow-auto gradient-mesh">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-extrabold text-foreground tracking-tight">Stok Takibi</h1>
        <p className="text-sm text-muted-foreground mt-1">Klinik envanter yönetimi</p>
      </motion.div>

      {/* Critical Alert */}
      {criticalItems.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">Kritik Stok Uyarısı</p>
            <p className="text-xs text-muted-foreground mt-1">
              {criticalItems.map(i => i.name).join(", ")} — kritik seviyenin altında.
            </p>
          </div>
        </motion.div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Ürün ara..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10 rounded-xl" />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowLogDialog(true)} variant="outline" className="rounded-xl gap-2">
            <History className="w-4 h-4" /> Geçmiş
          </Button>
          <Button onClick={() => setShowAddDialog(true)} className="rounded-xl gap-2">
            <Plus className="w-4 h-4" /> Yeni Ürün
          </Button>
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <Package className="w-7 h-7 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {items.length === 0 ? "Henüz ürün eklenmedi" : "Aramanızla eşleşen ürün yok"}
          </p>
          {items.length === 0 && (
            <Button onClick={() => setShowAddDialog(true)} variant="outline" className="mt-4 rounded-xl gap-2">
              <Plus className="w-4 h-4" /> İlk ürünü ekleyin
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item, i) => {
            const isCritical = item.current_stock <= item.critical_level;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-2xl border bg-card p-5 space-y-3 shadow-card ${isCritical ? "border-destructive/40" : "border-border/60"}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
                    <Badge variant="secondary" className="mt-1 text-[10px]">{item.category}</Badge>
                  </div>
                  {isCritical && (
                    <Badge variant="destructive" className="text-[10px] gap-1">
                      <AlertTriangle className="w-3 h-3" /> Kritik
                    </Badge>
                  )}
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className={`text-2xl font-bold font-display ${isCritical ? "text-destructive" : "text-foreground"}`}>
                      {item.current_stock}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{item.unit} · Min: {item.critical_level}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" onClick={() => { setStockChangeItem(item); }}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" onClick={() => { setStockChangeItem(item); }}>
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Ürün Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Ürün Adı</Label>
              <Input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="Ürün adı..." />
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={newItem.category} onValueChange={v => setNewItem({ ...newItem, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kritik Seviye</Label>
                <Input type="number" value={newItem.critical_level} onChange={e => setNewItem({ ...newItem, critical_level: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Birim</Label>
                <Input value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} placeholder="adet, kutu, ml..." />
              </div>
            </div>
            <Button onClick={handleAddItem} disabled={saving} className="w-full rounded-xl">
              {saving ? "Kaydediliyor..." : "Ekle"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Change Dialog */}
      <Dialog open={!!stockChangeItem} onOpenChange={v => !v && setStockChangeItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Stok Güncelle — {stockChangeItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Mevcut: <strong>{stockChangeItem?.current_stock} {stockChangeItem?.unit}</strong></p>
            <div className="space-y-2">
              <Label>Miktar</Label>
              <Input type="number" value={changeAmount} onChange={e => setChangeAmount(e.target.value)} placeholder="0" min="1" />
            </div>
            <div className="space-y-2">
              <Label>Açıklama (opsiyonel)</Label>
              <Input value={changeReason} onChange={e => setChangeReason(e.target.value)} placeholder="Neden?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => handleStockChange("add")} disabled={saving} className="rounded-xl gap-1.5 bg-success hover:bg-success/90 text-white">
                <Plus className="w-4 h-4" /> Ekle
              </Button>
              <Button onClick={() => handleStockChange("remove")} disabled={saving} variant="destructive" className="rounded-xl gap-1.5">
                <Minus className="w-4 h-4" /> Çıkar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="sm:max-w-lg max-h-[70vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Stok Geçmişi</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {logsWithNames.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Henüz kayıt yok</p>
            ) : logsWithNames.map(log => (
              <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/20">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${log.change_amount > 0 ? "bg-success/10" : "bg-destructive/10"}`}>
                  {log.change_amount > 0 ? <Plus className="w-4 h-4 text-success" /> : <Minus className="w-4 h-4 text-destructive" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{log.item_name}</p>
                  <p className="text-[11px] text-muted-foreground">{log.reason || "—"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${log.change_amount > 0 ? "text-success" : "text-destructive"}`}>
                    {log.change_amount > 0 ? "+" : ""}{log.change_amount}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(log.created_at).toLocaleDateString("tr-TR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;

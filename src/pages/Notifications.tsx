import { Bell } from "lucide-react";

const Notifications = () => {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Bildirimler</h1>
        <p className="text-sm text-muted-foreground mt-1">Tüm bildirimleriniz</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Bell className="w-12 h-12 text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm">Bildirimler yakında burada görüntülenecek.</p>
      </div>
    </div>
  );
};

export default Notifications;

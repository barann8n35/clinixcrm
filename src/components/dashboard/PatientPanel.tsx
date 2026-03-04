import { Phone, MapPin, AlertCircle, CheckCircle, XCircle, Clock, CalendarDays } from "lucide-react";
import { MiniSchedule } from "./MiniSchedule";

export function PatientPanel() {
  return (
    <div className="flex flex-col h-full bg-card w-80 overflow-y-auto scrollbar-thin">
      {/* Patient Card */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/12 flex items-center justify-center">
            <span className="text-primary font-display font-bold text-base">BZ</span>
          </div>
          <div>
            <h3 className="font-display font-semibold text-[15px] text-foreground">Büşra Zeydan</h3>
            <span className="inline-flex items-center gap-1 text-[11px] text-warning font-medium bg-warning/10 px-2 py-0.5 rounded-full mt-0.5">
              <Clock className="w-3 h-3" />
              Pending
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-[13px]">
            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-foreground">+90 555 234 ****</span>
          </div>
          <div className="flex items-center gap-2.5 text-[13px]">
            <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-foreground">Complaint: Back pain</span>
          </div>
          <div className="flex items-center gap-2.5 text-[13px]">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-foreground">Istanbul, Turkey</span>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground/60 mt-3 font-mono">Event ID: #3kq90rv-8f2a-4b1c</p>
      </div>

      {/* Quick Actions */}
      <div className="p-5 border-b border-border">
        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h4>
        <div className="space-y-2">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-success text-success-foreground font-medium text-[13px] hover:bg-success/90 transition-all shadow-card hover:shadow-elevated">
            <CheckCircle className="w-4 h-4" />
            Approve Appointment
          </button>
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-medium text-[13px] hover:bg-destructive/90 transition-all shadow-card hover:shadow-elevated">
            <XCircle className="w-4 h-4" />
            Cancel Appointment
          </button>
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-warning text-warning-foreground font-medium text-[13px] hover:bg-warning/90 transition-all shadow-card hover:shadow-elevated">
            <CalendarDays className="w-4 h-4" />
            Reschedule
          </button>
        </div>
      </div>

      {/* Mini Schedule */}
      <div className="p-5 flex-1">
        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Today's Schedule</h4>
        <MiniSchedule />
      </div>
    </div>
  );
}

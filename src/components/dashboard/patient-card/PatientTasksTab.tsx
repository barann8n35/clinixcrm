import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Calendar, CheckCircle2, Circle, Trash2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";

interface Task {
  id: string;
  text: string;
  completed: boolean;
  dueDate: Date | null;
  createdAt: Date;
}

const MOCK_TASKS: Task[] = [
  { id: "1", text: "Ameliyat öncesi kan tahlili iste", completed: true, dueDate: new Date("2026-03-28"), createdAt: new Date("2026-03-25") },
  { id: "2", text: "MR sonucunu doktora ilet", completed: false, dueDate: new Date("2026-04-02"), createdAt: new Date("2026-03-27") },
  { id: "3", text: "Sigorta onayını takip et", completed: false, dueDate: new Date("2026-04-05"), createdAt: new Date("2026-03-29") },
  { id: "4", text: "Post-op kontrol randevusu oluştur", completed: false, dueDate: null, createdAt: new Date("2026-03-30") },
];

export function PatientTasksTab() {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [newTask, setNewTask] = useState("");
  const [newDate, setNewDate] = useState<Date | undefined>();

  function addTask() {
    const text = newTask.trim();
    if (!text) return;
    const task: Task = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      dueDate: newDate || null,
      createdAt: new Date(),
    };
    setTasks(prev => [task, ...prev]);
    setNewTask("");
    setNewDate(undefined);
    toast.success("Görev eklendi");
  }

  function toggleTask(id: string) {
    setTasks(prev =>
      prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    );
  }

  function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id));
    toast.success("Görev silindi");
  }

  const pending = tasks.filter(t => !t.completed);
  const completed = tasks.filter(t => t.completed);

  function isOverdue(task: Task) {
    return task.dueDate && !task.completed && task.dueDate < new Date();
  }

  return (
    <div className="p-1 space-y-4">
      {/* Add Task */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-4 space-y-3"
      >
        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Yeni Görev</h4>
        <div className="flex gap-2">
          <Input
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTask()}
            placeholder="Görev açıklaması..."
            className="h-9 text-[13px] bg-muted/40 border-border rounded-xl"
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className={cn("h-9 w-9 rounded-xl shrink-0", newDate && "border-primary/50 text-primary")}>
                <Calendar className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarPicker
                mode="single"
                selected={newDate}
                onSelect={setNewDate}
                className={cn("p-3 pointer-events-auto")}
                locale={tr}
              />
            </PopoverContent>
          </Popover>
          <Button onClick={addTask} size="icon" className="h-9 w-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {newDate && (
          <p className="text-[11px] text-primary flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(newDate, "d MMMM yyyy", { locale: tr })}
          </p>
        )}
      </motion.div>

      {/* Pending Tasks */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Bekleyen ({pending.length})
          </h4>
          <AnimatePresence>
            {pending.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8, height: 0 }}
                transition={{ delay: i * 0.04 }}
                className={cn(
                  "group rounded-xl border bg-card p-3 flex items-start gap-3 hover:shadow-card transition-all duration-200",
                  isOverdue(task) ? "border-destructive/30 bg-destructive/5" : "border-border"
                )}
              >
                <button onClick={() => toggleTask(task.id)} className="mt-0.5 shrink-0">
                  <Circle className="w-[18px] h-[18px] text-muted-foreground/40 hover:text-primary transition-colors" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-foreground leading-snug">{task.text}</p>
                  {task.dueDate && (
                    <span className={cn(
                      "text-[10px] flex items-center gap-1 mt-1",
                      isOverdue(task) ? "text-destructive font-medium" : "text-muted-foreground"
                    )}>
                      <Clock className="w-3 h-3" />
                      {format(task.dueDate, "d MMM", { locale: tr })}
                      {isOverdue(task) && " · Gecikmiş"}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive transition-colors" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Completed Tasks */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Tamamlanan ({completed.length})
          </h4>
          {completed.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              className="group rounded-xl border border-border/50 bg-muted/30 p-3 flex items-start gap-3"
            >
              <button onClick={() => toggleTask(task.id)} className="mt-0.5 shrink-0">
                <CheckCircle2 className="w-[18px] h-[18px] text-success" />
              </button>
              <p className="text-[13px] text-muted-foreground line-through flex-1">{task.text}</p>
              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive transition-colors" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {tasks.length === 0 && (
        <div className="flex flex-col items-center py-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6 text-muted-foreground/30" />
          </div>
          <p className="text-sm text-muted-foreground/60">Henüz görev eklenmedi</p>
        </div>
      )}
    </div>
  );
}

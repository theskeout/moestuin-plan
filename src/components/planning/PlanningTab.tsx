"use client";

import { MonthlyTask, RotationWarning } from "@/lib/planning/types";
import { AlertTriangle, CheckCircle2, Scissors, Sprout, Bug, Calendar } from "lucide-react";

const MONTH_NAMES = ["", "Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

function TaskIcon({ type }: { type: MonthlyTask["type"] }) {
  switch (type) {
    case "sow-indoor": return <Sprout className="h-3.5 w-3.5 text-green-600" />;
    case "sow-outdoor": return <Sprout className="h-3.5 w-3.5 text-emerald-500" />;
    case "harvest": return <CheckCircle2 className="h-3.5 w-3.5 text-orange-500" />;
    case "maintenance": return <Scissors className="h-3.5 w-3.5 text-blue-500" />;
    case "warning": return <Bug className="h-3.5 w-3.5 text-red-500" />;
  }
}

interface PlanningTabProps {
  currentTasks: MonthlyTask[];
  upcomingTasks: MonthlyTask[];
  rotationWarnings: RotationWarning[];
  onCompleteTask: (zoneId: string, taskId: string) => void;
  onOpenFullView: () => void;
}

export default function PlanningTab({
  currentTasks,
  upcomingTasks,
  rotationWarnings,
  onCompleteTask,
  onOpenFullView,
}: PlanningTabProps) {
  const currentMonth = new Date().getMonth() + 1;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;

  const groupedUpcoming = groupByZone(upcomingTasks);

  // Split in open taken, afgeronde taken, en waarschuwingen
  const todoTasks = currentTasks.filter((t) => !t.completed && t.type !== "warning");
  const doneTasks = currentTasks.filter((t) => t.completed && t.type !== "warning");
  const warningTasks = currentTasks.filter((t) => t.type === "warning");

  return (
    <div className="space-y-4">
      {/* Nu te doen */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Nu te doen — {MONTH_NAMES[currentMonth]}
        </h4>
        {todoTasks.length === 0 && doneTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen taken deze maand</p>
        ) : todoTasks.length === 0 ? (
          <p className="text-sm text-green-600">Alles afgerond!</p>
        ) : (
          <div className="space-y-1">
            {todoTasks.map((task, i) => (
              <button
                key={`${task.zoneId}-${task.task.id}-${i}`}
                onClick={() => onCompleteTask(task.zoneId, task.task.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm hover:bg-accent transition-colors group"
              >
                <TaskIcon type={task.type} />
                <span className="text-sm">{task.plantIcon}</span>
                <span className="flex-1 truncate text-xs">
                  {task.task.name}
                </span>
                <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  Klaar
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Afgerond (toggle: klik om ongedaan te maken) */}
      {doneTasks.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">
            Afgerond
          </h4>
          <div className="space-y-1">
            {doneTasks.map((task, i) => (
              <button
                key={`done-${task.zoneId}-${task.task.id}-${i}`}
                onClick={() => onCompleteTask(task.zoneId, task.task.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm opacity-60 hover:bg-accent hover:opacity-100 transition-all group"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                <span className="text-sm">{task.plantIcon}</span>
                <span className="flex-1 truncate text-xs line-through">
                  {task.task.name}
                </span>
                <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  Ongedaan
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Waarschuwingen */}
      {warningTasks.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
            Let op
          </h4>
          <div className="space-y-1">
            {warningTasks.map((task, i) => (
              <div
                key={`warn-${task.zoneId}-${task.task.id}-${i}`}
                className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-red-50 text-sm"
              >
                <Bug className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-medium">{task.plantIcon} {task.task.name}</span>
                  {task.task.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{task.task.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rotatie-waarschuwingen */}
      {rotationWarnings.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">
            Gewasrotatie
          </h4>
          <div className="space-y-1">
            {rotationWarnings.map((w) => (
              <div
                key={`rot-${w.zoneId}`}
                className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-amber-50 text-sm"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-medium">{w.plantName}</span>
                  <p className="text-xs text-muted-foreground">
                    {w.familyName} stond hier in {w.conflictYear} ({w.conflictPlant}).
                    Wacht {w.rotationYears} jaar.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Binnenkort */}
      {groupedUpcoming.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Binnenkort — {MONTH_NAMES[nextMonth]}
          </h4>
          <div className="space-y-1">
            {upcomingTasks.filter((t) => t.type !== "warning").slice(0, 8).map((task, i) => (
              <div
                key={`up-${task.zoneId}-${task.task.id}-${i}`}
                className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground"
              >
                <TaskIcon type={task.type} />
                <span>{task.plantIcon}</span>
                <span className="truncate">{task.task.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Volledig overzicht knop */}
      <button
        onClick={onOpenFullView}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-sm font-medium hover:bg-accent transition-colors"
      >
        <Calendar className="h-4 w-4" />
        Volledig overzicht
      </button>
    </div>
  );
}

function groupByZone(tasks: MonthlyTask[]): { zoneId: string; plantName: string; tasks: MonthlyTask[] }[] {
  const map = new Map<string, { plantName: string; tasks: MonthlyTask[] }>();
  for (const task of tasks) {
    const existing = map.get(task.zoneId);
    if (existing) {
      existing.tasks.push(task);
    } else {
      map.set(task.zoneId, { plantName: task.plantName, tasks: [task] });
    }
  }
  return Array.from(map.entries()).map(([zoneId, data]) => ({
    zoneId,
    ...data,
  }));
}

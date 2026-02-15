"use client";

import { useState } from "react";
import { MonthlyTask } from "@/lib/planning/types";
import { Sprout, CheckCircle2, Scissors, Bug, Check } from "lucide-react";
import { getISOWeek, formatWeekLabel } from "@/lib/planning/weeks";

type Filter = "alles" | "zaai" | "onderhoud" | "oogst" | "waarschuwing";

function TaskIcon({ type }: { type: MonthlyTask["type"] }) {
  switch (type) {
    case "sow-indoor": return <Sprout className="h-4 w-4 text-purple-600" />;
    case "sow-outdoor": return <Sprout className="h-4 w-4 text-green-600" />;
    case "harvest": return <CheckCircle2 className="h-4 w-4 text-orange-500" />;
    case "maintenance": return <Scissors className="h-4 w-4 text-blue-500" />;
    case "warning": return <Bug className="h-4 w-4 text-red-500" />;
  }
}

interface TaskListViewProps {
  currentTasks: MonthlyTask[];
  currentWeek?: number;
  onCompleteTask: (zoneId: string, taskId: string) => void;
}

export default function TaskListView({ currentTasks, currentWeek, onCompleteTask }: TaskListViewProps) {
  const [filter, setFilter] = useState<Filter>("alles");
  const now = new Date();
  const week = currentWeek ?? getISOWeek(now);
  const year = now.getFullYear();

  const filtered = currentTasks.filter((t) => {
    switch (filter) {
      case "zaai": return t.type === "sow-indoor" || t.type === "sow-outdoor";
      case "onderhoud": return t.type === "maintenance";
      case "oogst": return t.type === "harvest";
      case "waarschuwing": return t.type === "warning";
      default: return true;
    }
  });

  // Groepeer per zone
  const grouped = new Map<string, { plantName: string; plantIcon: string; tasks: MonthlyTask[] }>();
  for (const task of filtered) {
    const existing = grouped.get(task.zoneId);
    if (existing) {
      existing.tasks.push(task);
    } else {
      grouped.set(task.zoneId, { plantName: task.plantName, plantIcon: task.plantIcon, tasks: [task] });
    }
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "alles", label: "Alles" },
    { key: "zaai", label: "Zaaien" },
    { key: "onderhoud", label: "Onderhoud" },
    { key: "oogst", label: "Oogst" },
    { key: "waarschuwing", label: "Waarsch." },
  ];

  const openCount = filtered.filter((t) => !t.completed && t.type !== "warning").length;
  const doneCount = filtered.filter((t) => t.completed).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{formatWeekLabel(week, year)}</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{openCount} open</span>
          {doneCount > 0 && <span className="text-green-600">{doneCount} afgerond</span>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 flex-wrap">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === key
                ? "bg-foreground text-background"
                : "bg-accent text-foreground hover:bg-accent/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Taken per zone */}
      {grouped.size === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Geen taken gevonden voor dit filter
        </p>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([zoneId, { plantName, plantIcon, tasks }]) => (
            <div key={zoneId} className="space-y-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base">{plantIcon}</span>
                <span className="text-sm font-medium">{plantName}</span>
              </div>
              {tasks.map((task, i) => (
                <div
                  key={`${task.task.id}-${i}`}
                  className={`flex items-start gap-2 px-3 py-2 rounded-md text-sm ${
                    task.type === "warning"
                      ? "bg-red-50"
                      : task.completed
                      ? "bg-green-50 opacity-60"
                      : "bg-accent/50"
                  }`}
                >
                  <TaskIcon type={task.type} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                      {task.task.name}
                    </p>
                    {task.task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {task.task.description}
                      </p>
                    )}
                  </div>
                  {task.type !== "warning" && (
                    <button
                      onClick={() => onCompleteTask(task.zoneId, task.task.id)}
                      className={`shrink-0 p-1 rounded transition-colors ${
                        task.completed
                          ? "text-green-600 hover:text-red-500 hover:bg-red-50"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`}
                      title={task.completed ? "Klik om ongedaan te maken" : "Markeer als klaar"}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

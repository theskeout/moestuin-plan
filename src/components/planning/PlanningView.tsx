"use client";

// PlanningView full-screen overlay
import { Garden } from "@/lib/garden/types";
import { MonthlyTask, RotationWarning, SeasonArchive, UserSettings } from "@/lib/planning/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X } from "lucide-react";
import CalendarGrid from "./CalendarGrid";
import TaskListView from "./TaskListView";
import DiscoverCalendar from "./DiscoverCalendar";
import RotationHistory from "./RotationHistory";
import RegionSettings from "./RegionSettings";

interface PlanningViewProps {
  open: boolean;
  onClose: () => void;
  garden: Garden;
  currentTasks: MonthlyTask[];
  currentWeek?: number;
  rotationWarnings: RotationWarning[];
  archives: SeasonArchive[];
  settings: UserSettings;
  onCompleteTask: (zoneId: string, taskId: string) => void;
  onArchiveSeason: (year: number) => void;
  onDeleteArchive: (year: number) => void;
  onSaveSettings: (settings: UserSettings) => void;
  onSelectZone?: (zoneId: string) => void;
  onAddPlant?: (plantId: string) => void;
}

export default function PlanningView({
  open,
  onClose,
  garden,
  currentTasks,
  currentWeek,
  rotationWarnings,
  archives,
  settings,
  onCompleteTask,
  onArchiveSeason,
  onDeleteArchive,
  onSaveSettings,
  onSelectZone,
  onAddPlant,
}: PlanningViewProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <h2 className="text-base font-semibold">Planning — {garden.name}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="kalender" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-2 shrink-0">
            <TabsList>
              <TabsTrigger value="kalender">Kalender</TabsTrigger>
              <TabsTrigger value="taken">Taken</TabsTrigger>
              <TabsTrigger value="ontdek">Ontdek</TabsTrigger>
              <TabsTrigger value="rotatie">Rotatie</TabsTrigger>
              <TabsTrigger value="instellingen">Regio</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="kalender" className="p-4 mt-0">
              <CalendarGrid
                garden={garden}
                settings={settings}
                onSelectZone={(id) => { onSelectZone?.(id); onClose(); }}
              />
            </TabsContent>

            <TabsContent value="taken" className="p-4 mt-0">
              <TaskListView
                currentTasks={currentTasks}
                currentWeek={currentWeek}
                onCompleteTask={onCompleteTask}
              />
            </TabsContent>

            <TabsContent value="ontdek" className="p-4 mt-0">
              <DiscoverCalendar
                settings={settings}
                onAddPlant={onAddPlant ? (id) => { onAddPlant(id); } : undefined}
              />
            </TabsContent>

            <TabsContent value="rotatie" className="p-4 mt-0">
              <RotationHistory
                garden={garden}
                archives={archives}
                rotationWarnings={rotationWarnings}
                onArchiveSeason={onArchiveSeason}
                onDeleteArchive={onDeleteArchive}
              />
            </TabsContent>

            <TabsContent value="instellingen" className="p-4 mt-0">
              <RegionSettings
                settings={settings}
                onSave={onSaveSettings}
              />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

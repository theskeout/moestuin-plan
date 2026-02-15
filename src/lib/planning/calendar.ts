import { Garden, CropZone, ZoneStatus } from "@/lib/garden/types";
import { PlantData, MonthRange } from "@/lib/plants/types";
import { getPlant } from "@/lib/plants/catalog";
import { getWarnings, getTasksForMonth } from "./tasks";
import { adjustSowingMonth, adjustSowingWeek, getStationByCode } from "./frost";
import { MaintenanceTask, MonthlyTask, WeeklyTask, StatusHint, UserSettings } from "./types";
import { monthRangeToWeekRange, isInWeekRange, getWeekDates, frostDateToWeek } from "./weeks";
import allPlantsJson from "@/data/plants.json";

function isInMonthRange(month: number, range: MonthRange | null): boolean {
  if (!range) return false;
  if (range.start <= range.end) {
    return month >= range.start && month <= range.end;
  }
  // Wrap around (bijv. okt-mrt)
  return month >= range.start || month <= range.end;
}

/** Check of een recurring taak opnieuw moet verschijnen na de frequentie-interval */
function isTaskCompleted(
  completedTasks: Record<string, string> | undefined,
  task: MaintenanceTask
): boolean {
  if (!completedTasks) return false;
  const dateStr = completedTasks[task.id];
  if (!dateStr) return false;

  // "once" taken blijven afgevinkt
  if (task.frequency === "once" || task.frequency === "yearly") return true;

  const completedDate = new Date(dateStr);
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));

  const intervalDays: Record<string, number> = {
    daily: 1,
    weekly: 7,
    biweekly: 14,
    monthly: 30,
  };

  const interval = intervalDays[task.frequency];
  if (!interval) return true; // onbekende frequentie → blijft afgevinkt
  return daysSince < interval;
}

function adjustRange(range: MonthRange | null, settings?: UserSettings): MonthRange | null {
  if (!range) return null;
  return {
    start: adjustSowingMonth(range.start, settings),
    end: adjustSowingMonth(range.end, settings),
  };
}

export function getMonthlyTasks(
  garden: Garden,
  month: number,
  year: number,
  settings?: UserSettings
): MonthlyTask[] {
  const tasks: MonthlyTask[] = [];

  for (const zone of garden.zones) {
    const plant = getPlant(zone.plantId);
    if (!plant) continue;

    const adjustedSowIndoor = adjustRange(plant.sowIndoor, settings);
    const adjustedSowOutdoor = adjustRange(plant.sowOutdoor, settings);

    // Zaai-reminders
    if (isInMonthRange(month, adjustedSowIndoor)) {
      tasks.push({
        zoneId: zone.id,
        plantId: plant.id,
        plantName: plant.name,
        plantIcon: plant.icon,
        type: "sow-indoor",
        task: {
          id: `sow-indoor-${plant.id}`,
          name: `${plant.name} voorzaaien (binnen)`,
          frequency: "once",
          phase: "sowing",
          description: `Zaai ${plant.name.toLowerCase()} voor binnen/onder glas`,
        },
        completed: zone.status !== "planned" && zone.status !== undefined,
      });
    }

    if (isInMonthRange(month, adjustedSowOutdoor)) {
      tasks.push({
        zoneId: zone.id,
        plantId: plant.id,
        plantName: plant.name,
        plantIcon: plant.icon,
        type: "sow-outdoor",
        task: {
          id: `sow-outdoor-${plant.id}`,
          name: `${plant.name} buiten zaaien`,
          frequency: "once",
          phase: "sowing",
          description: `Zaai ${plant.name.toLowerCase()} direct buiten`,
        },
        completed: zone.status !== "planned" && zone.status !== undefined,
      });
    }

    // Oogst-reminder
    if (isInMonthRange(month, plant.harvest)) {
      tasks.push({
        zoneId: zone.id,
        plantId: plant.id,
        plantName: plant.name,
        plantIcon: plant.icon,
        type: "harvest",
        task: {
          id: `harvest-${plant.id}`,
          name: `${plant.name} oogsten`,
          frequency: "once",
          phase: "harvesting",
          description: `${plant.name} kan nu geoogst worden`,
        },
        completed: zone.status === "done",
      });
    }

    // Onderhoudstaken
    const maintenanceTasks = getTasksForMonth(zone.plantId, month);
    for (const task of maintenanceTasks) {
      tasks.push({
        zoneId: zone.id,
        plantId: plant.id,
        plantName: plant.name,
        plantIcon: plant.icon,
        type: "maintenance",
        task,
        completed: isTaskCompleted(zone.completedTasks, task),
      });
    }

    // Waarschuwingen
    const warnings = getWarnings(zone.plantId, month);
    for (const warning of warnings) {
      tasks.push({
        zoneId: zone.id,
        plantId: plant.id,
        plantName: plant.name,
        plantIcon: plant.icon,
        type: "warning",
        task: warning,
      });
    }
  }

  return tasks;
}

export function getZoneTasks(
  zone: CropZone,
  plant: PlantData,
  currentDate: Date,
  settings?: UserSettings
): MonthlyTask[] {
  const month = currentDate.getMonth() + 1;
  const tasks: MonthlyTask[] = [];

  const adjustedSowIndoor = adjustRange(plant.sowIndoor, settings);
  const adjustedSowOutdoor = adjustRange(plant.sowOutdoor, settings);

  if (isInMonthRange(month, adjustedSowIndoor)) {
    tasks.push({
      zoneId: zone.id,
      plantId: plant.id,
      plantName: plant.name,
      plantIcon: plant.icon,
      type: "sow-indoor",
      task: {
        id: `sow-indoor-${plant.id}`,
        name: `Voorzaaien (binnen)`,
        frequency: "once",
        phase: "sowing",
      },
      completed: zone.status !== "planned" && zone.status !== undefined,
    });
  }

  if (isInMonthRange(month, adjustedSowOutdoor)) {
    tasks.push({
      zoneId: zone.id,
      plantId: plant.id,
      plantName: plant.name,
      plantIcon: plant.icon,
      type: "sow-outdoor",
      task: {
        id: `sow-outdoor-${plant.id}`,
        name: `Buiten zaaien`,
        frequency: "once",
        phase: "sowing",
      },
      completed: zone.status !== "planned" && zone.status !== undefined,
    });
  }

  if (isInMonthRange(month, plant.harvest)) {
    tasks.push({
      zoneId: zone.id,
      plantId: plant.id,
      plantName: plant.name,
      plantIcon: plant.icon,
      type: "harvest",
      task: {
        id: `harvest-${plant.id}`,
        name: `Oogsten`,
        frequency: "once",
        phase: "harvesting",
      },
      completed: zone.status === "done",
    });
  }

  const maintenanceTasks = getTasksForMonth(zone.plantId, month);
  for (const task of maintenanceTasks) {
    tasks.push({
      zoneId: zone.id,
      plantId: plant.id,
      plantName: plant.name,
      plantIcon: plant.icon,
      type: "maintenance",
      task,
      completed: isTaskCompleted(zone.completedTasks, task),
    });
  }

  const warnings = getWarnings(zone.plantId, month);
  for (const warning of warnings) {
    tasks.push({
      zoneId: zone.id,
      plantId: plant.id,
      plantName: plant.name,
      plantIcon: plant.icon,
      type: "warning",
      task: warning,
    });
  }

  return tasks;
}

export interface PlantCalendarEntry {
  plant: PlantData;
  sowIndoor: MonthRange | null;
  sowOutdoor: MonthRange | null;
  harvest: MonthRange;
  adjustedSowIndoor?: MonthRange | null;
  adjustedSowOutdoor?: MonthRange | null;
}

/** Status-filtering: welke taaktypes zijn relevant per zone-status */
const STATUS_TASK_FILTER: Record<ZoneStatus, { sow: boolean; maintenance: boolean; harvest: boolean; warning: boolean }> = {
  planned:       { sow: true,  maintenance: false, harvest: false, warning: false },
  "sown-indoor": { sow: false, maintenance: false, harvest: false, warning: true  },
  "sown-outdoor":{ sow: false, maintenance: false, harvest: false, warning: true  },
  transplanted:  { sow: false, maintenance: true,  harvest: false, warning: true  },
  growing:       { sow: false, maintenance: true,  harvest: true,  warning: true  },
  harvesting:    { sow: false, maintenance: false, harvest: true,  warning: true  },
  done:          { sow: false, maintenance: false, harvest: false, warning: false },
};

function adjustWeekRange(range: MonthRange | null, settings?: UserSettings): { startWeek: number; endWeek: number } | null {
  if (!range) return null;
  const weekRange = monthRangeToWeekRange(range);
  return {
    startWeek: adjustSowingWeek(weekRange.startWeek, settings),
    endWeek: adjustSowingWeek(weekRange.endWeek, settings),
  };
}

export function getWeeklyTasks(
  garden: Garden,
  weekNumber: number,
  year: number,
  settings?: UserSettings
): WeeklyTask[] {
  const tasks: WeeklyTask[] = [];
  const { start: weekStart } = getWeekDates(weekNumber, year);
  const weekMonth = weekStart.getMonth() + 1;

  for (const zone of garden.zones) {
    const plant = getPlant(zone.plantId);
    if (!plant) continue;

    const status: ZoneStatus = zone.status || "planned";
    const filter = STATUS_TASK_FILTER[status];

    // Zaai-taken op weekniveau
    if (filter.sow) {
      const adjustedSowIndoor = adjustWeekRange(plant.sowIndoor, settings);
      const adjustedSowOutdoor = adjustWeekRange(plant.sowOutdoor, settings);

      if (adjustedSowIndoor && isInWeekRange(weekNumber, adjustedSowIndoor)) {
        tasks.push({
          zoneId: zone.id,
          plantId: plant.id,
          plantName: plant.name,
          plantIcon: plant.icon,
          type: "sow-indoor",
          task: {
            id: `sow-indoor-${plant.id}`,
            name: `${plant.name} voorzaaien (binnen)`,
            frequency: "once",
            phase: "sowing",
            description: `Zaai ${plant.name.toLowerCase()} voor binnen/onder glas`,
          },
          completed: false,
          weekNumber,
        });
      }

      if (adjustedSowOutdoor && isInWeekRange(weekNumber, adjustedSowOutdoor)) {
        tasks.push({
          zoneId: zone.id,
          plantId: plant.id,
          plantName: plant.name,
          plantIcon: plant.icon,
          type: "sow-outdoor",
          task: {
            id: `sow-outdoor-${plant.id}`,
            name: `${plant.name} buiten zaaien`,
            frequency: "once",
            phase: "sowing",
            description: `Zaai ${plant.name.toLowerCase()} direct buiten`,
          },
          completed: false,
          weekNumber,
        });
      }
    }

    // Oogst op maand-niveau (data is per maand)
    if (filter.harvest && isInMonthRange(weekMonth, plant.harvest)) {
      tasks.push({
        zoneId: zone.id,
        plantId: plant.id,
        plantName: plant.name,
        plantIcon: plant.icon,
        type: "harvest",
        task: {
          id: `harvest-${plant.id}`,
          name: `${plant.name} oogsten`,
          frequency: "once",
          phase: "harvesting",
          description: `${plant.name} kan nu geoogst worden`,
        },
        completed: zone.status === "done",
        weekNumber,
      });
    }

    // Onderhoud op maand-niveau
    if (filter.maintenance) {
      const maintenanceTasks = getTasksForMonth(zone.plantId, weekMonth);
      for (const task of maintenanceTasks) {
        tasks.push({
          zoneId: zone.id,
          plantId: plant.id,
          plantName: plant.name,
          plantIcon: plant.icon,
          type: "maintenance",
          task,
          completed: isTaskCompleted(zone.completedTasks, task),
          weekNumber,
        });
      }
    }

    // Waarschuwingen op maand-niveau
    if (filter.warning) {
      const warnings = getWarnings(zone.plantId, weekMonth);
      for (const warning of warnings) {
        tasks.push({
          zoneId: zone.id,
          plantId: plant.id,
          plantName: plant.name,
          plantIcon: plant.icon,
          type: "warning",
          task: warning,
          weekNumber,
        });
      }
    }
  }

  return tasks;
}

/** Genereer status-transitie suggesties */
export function getStatusHints(
  garden: Garden,
  currentWeek: number,
  currentYear: number,
  settings?: UserSettings
): StatusHint[] {
  const hints: StatusHint[] = [];

  // Bepaal vorstweek
  const stationCode = settings?.knmiStationCode || "260";
  const station = getStationByCode(stationCode);
  const frostDateStr = station?.avgLastFrostDate || "04-20";
  const frostWeek = frostDateToWeek(frostDateStr, currentYear);

  for (const zone of garden.zones) {
    const plant = getPlant(zone.plantId);
    if (!plant) continue;

    const status: ZoneStatus = zone.status || "planned";

    if (status === "planned") {
      // Check zaaitijd indoor
      const sowIndoorWeeks = adjustWeekRange(plant.sowIndoor, settings);
      if (sowIndoorWeeks && isInWeekRange(currentWeek, sowIndoorWeeks)) {
        hints.push({
          zoneId: zone.id,
          plantId: plant.id,
          plantName: plant.name,
          plantIcon: plant.icon,
          type: "status-hint",
          suggestedStatus: "sown-indoor",
          message: `${plant.name} voorzaaien?`,
          description: "Het is zaaitijd voor binnen/onder glas",
        });
        continue; // 1 hint per zone
      }
      // Check zaaitijd outdoor
      const sowOutdoorWeeks = adjustWeekRange(plant.sowOutdoor, settings);
      if (sowOutdoorWeeks && isInWeekRange(currentWeek, sowOutdoorWeeks)) {
        hints.push({
          zoneId: zone.id,
          plantId: plant.id,
          plantName: plant.name,
          plantIcon: plant.icon,
          type: "status-hint",
          suggestedStatus: "sown-outdoor",
          message: `${plant.name} buiten zaaien?`,
          description: "Het is zaaitijd voor buiten",
        });
      }
    }

    if (status === "sown-indoor") {
      // Na vorstdatum: uitplanten?
      if (currentWeek >= frostWeek + 1) {
        hints.push({
          zoneId: zone.id,
          plantId: plant.id,
          plantName: plant.name,
          plantIcon: plant.icon,
          type: "status-hint",
          suggestedStatus: "transplanted",
          message: `${plant.name} uitplanten?`,
          description: "Vorstdatum is voorbij",
        });
      }
    }

    if (status === "sown-outdoor") {
      // 2+ weken na zaai-event → growing?
      const sownEvent = zone.events?.filter((e) => e.type === "sown").pop();
      if (sownEvent) {
        const sownDate = new Date(sownEvent.date);
        const daysSince = Math.floor((Date.now() - sownDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince >= 14) {
          hints.push({
            zoneId: zone.id,
            plantId: plant.id,
            plantName: plant.name,
            plantIcon: plant.icon,
            type: "status-hint",
            suggestedStatus: "growing",
            message: `${plant.name} groeit?`,
            description: `${daysSince} dagen sinds zaaien`,
          });
        }
      }
    }

    if (status === "transplanted") {
      // 2+ weken na transplant → growing?
      const transplantEvent = zone.events?.filter((e) => e.type === "transplanted").pop();
      if (transplantEvent) {
        const tDate = new Date(transplantEvent.date);
        const daysSince = Math.floor((Date.now() - tDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince >= 14) {
          hints.push({
            zoneId: zone.id,
            plantId: plant.id,
            plantName: plant.name,
            plantIcon: plant.icon,
            type: "status-hint",
            suggestedStatus: "growing",
            message: `${plant.name} groeit goed?`,
            description: `${daysSince} dagen sinds uitplanten`,
          });
        }
      }
    }

    if (status === "growing") {
      // Oogstperiode? → harvesting
      const { start: weekStart } = getWeekDates(currentWeek, currentYear);
      const weekMonth = weekStart.getMonth() + 1;
      if (isInMonthRange(weekMonth, plant.harvest)) {
        hints.push({
          zoneId: zone.id,
          plantId: plant.id,
          plantName: plant.name,
          plantIcon: plant.icon,
          type: "status-hint",
          suggestedStatus: "harvesting",
          message: `${plant.name} oogsten?`,
          description: "Het is oogstperiode",
        });
      }
    }
  }

  return hints;
}

export function getAllPlantCalendar(settings?: UserSettings): PlantCalendarEntry[] {
  const allPlants = allPlantsJson as PlantData[];
  return allPlants.map((plant) => ({
    plant,
    sowIndoor: plant.sowIndoor,
    sowOutdoor: plant.sowOutdoor,
    harvest: plant.harvest,
    adjustedSowIndoor: adjustRange(plant.sowIndoor, settings),
    adjustedSowOutdoor: adjustRange(plant.sowOutdoor, settings),
  }));
}

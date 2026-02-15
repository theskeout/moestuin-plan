import { Garden, CropZone } from "@/lib/garden/types";
import { PlantData, MonthRange } from "@/lib/plants/types";
import { getPlant } from "@/lib/plants/catalog";
import { getWarnings, getTasksForMonth } from "./tasks";
import { adjustSowingMonth } from "./frost";
import { MonthlyTask, UserSettings } from "./types";
import allPlantsJson from "@/data/plants.json";

function isInMonthRange(month: number, range: MonthRange | null): boolean {
  if (!range) return false;
  if (range.start <= range.end) {
    return month >= range.start && month <= range.end;
  }
  // Wrap around (bijv. okt-mrt)
  return month >= range.start || month <= range.end;
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
        completed: zone.completedTasks?.includes(task.id) ?? false,
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
      completed: zone.completedTasks?.includes(task.id) ?? false,
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

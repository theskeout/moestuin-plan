import maintenanceData from "@/data/maintenance-tasks.json";
import { MaintenanceTask, PestWarning, WateringInfo, PlantTypeData } from "./types";
import { WaterNeed } from "@/lib/plants/types";

const plantTypeMap = new Map<string, string>();
const typeDataMap = new Map<string, PlantTypeData>();

// Bouw lookup maps
for (const [typeId, typeData] of Object.entries(maintenanceData.plantTypes)) {
  const data = typeData as PlantTypeData;
  typeDataMap.set(typeId, data);
  for (const plantId of data.plants) {
    plantTypeMap.set(plantId, typeId);
  }
}

export function getPlantType(plantId: string): string | null {
  return plantTypeMap.get(plantId) ?? null;
}

export function getMaintenanceTasks(plantId: string): MaintenanceTask[] {
  const typeId = plantTypeMap.get(plantId);
  if (!typeId) return [];
  const data = typeDataMap.get(typeId);
  return (data?.tasks ?? []) as MaintenanceTask[];
}

export function getWarnings(plantId: string, month?: number): PestWarning[] {
  const typeId = plantTypeMap.get(plantId);
  if (!typeId) return [];
  const data = typeDataMap.get(typeId);
  const warnings = (data?.warnings ?? []) as PestWarning[];
  if (month === undefined) return warnings;
  return warnings.filter((w) => w.months.includes(month));
}

export function getWateringSchedule(waterNeed: WaterNeed): WateringInfo {
  const defaults = maintenanceData.wateringDefaults as Record<string, WateringInfo>;
  return defaults[waterNeed] ?? defaults.gemiddeld;
}

export function getTasksForMonth(plantId: string, month: number): MaintenanceTask[] {
  const tasks = getMaintenanceTasks(plantId);
  return tasks.filter((t) => {
    if (t.months && t.months.length > 0) {
      return t.months.includes(month);
    }
    // Taken zonder specifieke maanden zijn altijd relevant tijdens groeiseizoen
    return true;
  });
}

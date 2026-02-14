import { Garden } from "@/lib/garden/types";
import { PlantData } from "@/lib/plants/types";
import { getGardenStorage, getPlantStorage } from "@/lib/storage";

const GARDENS_KEY = "moestuin-plan-gardens";
const CUSTOM_PLANTS_KEY = "moestuin-custom-plants";
const PLANT_OVERRIDES_KEY = "moestuin-plant-overrides";
const MIGRATION_DONE_KEY = "moestuin-migration-done";

export function hasLocalData(): boolean {
  if (typeof window === "undefined") return false;
  const gardens = localStorage.getItem(GARDENS_KEY);
  const customs = localStorage.getItem(CUSTOM_PLANTS_KEY);
  const overrides = localStorage.getItem(PLANT_OVERRIDES_KEY);

  const hasGardens = gardens ? JSON.parse(gardens).length > 0 : false;
  const hasCustoms = customs ? JSON.parse(customs).length > 0 : false;
  const hasOverrides = overrides ? Object.keys(JSON.parse(overrides)).length > 0 : false;

  return hasGardens || hasCustoms || hasOverrides;
}

export function wasMigrated(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MIGRATION_DONE_KEY) === "true";
}

export async function migrateLocalDataToSupabase(): Promise<void> {
  const gardenStorage = getGardenStorage();
  const plantStorage = getPlantStorage();

  // Migreer tuinen
  const gardensRaw = localStorage.getItem(GARDENS_KEY);
  if (gardensRaw) {
    const gardens = JSON.parse(gardensRaw) as Garden[];
    for (const garden of gardens) {
      await gardenStorage.saveGarden(garden);
    }
  }

  // Migreer custom plants
  const customsRaw = localStorage.getItem(CUSTOM_PLANTS_KEY);
  if (customsRaw) {
    const customs = JSON.parse(customsRaw) as PlantData[];
    for (const plant of customs) {
      await plantStorage.saveCustomPlant(plant);
    }
  }

  // Migreer plant overrides
  const overridesRaw = localStorage.getItem(PLANT_OVERRIDES_KEY);
  if (overridesRaw) {
    const overrides = JSON.parse(overridesRaw) as Record<string, PlantData>;
    for (const plant of Object.values(overrides)) {
      await plantStorage.savePlantOverride(plant);
    }
  }

  // Markeer als gemigreerd
  localStorage.setItem(MIGRATION_DONE_KEY, "true");
}

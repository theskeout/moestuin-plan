import plantsData from "@/data/plants.json";
import { PlantData } from "./types";

const CUSTOM_PLANTS_KEY = "moestuin-custom-plants";
const PLANT_OVERRIDES_KEY = "moestuin-plant-overrides";

export const builtinPlants: PlantData[] = plantsData as PlantData[];

function loadCustomPlants(): PlantData[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(CUSTOM_PLANTS_KEY);
    if (!data) return [];
    return JSON.parse(data) as PlantData[];
  } catch {
    return [];
  }
}

function saveCustomPlants(plants: PlantData[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CUSTOM_PLANTS_KEY, JSON.stringify(plants));
}

// --- Plant overrides (aangepaste versies van built-in planten) ---

function loadPlantOverrides(): Record<string, PlantData> {
  if (typeof window === "undefined") return {};
  try {
    const data = localStorage.getItem(PLANT_OVERRIDES_KEY);
    if (!data) return {};
    return JSON.parse(data) as Record<string, PlantData>;
  } catch {
    return {};
  }
}

function savePlantOverrides(overrides: Record<string, PlantData>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLANT_OVERRIDES_KEY, JSON.stringify(overrides));
}

export function savePlantOverride(plant: PlantData): void {
  const overrides = loadPlantOverrides();
  overrides[plant.id] = plant;
  savePlantOverrides(overrides);
}

export function isBuiltinPlant(id: string): boolean {
  return builtinPlants.some((p) => p.id === id);
}

export function hasOverride(id: string): boolean {
  return id in loadPlantOverrides();
}

export function resetOverride(id: string): void {
  const overrides = loadPlantOverrides();
  delete overrides[id];
  savePlantOverrides(overrides);
}

/** Alle planten: builtin (met overrides) + custom */
export function getAllPlants(): PlantData[] {
  const overrides = loadPlantOverrides();
  const plants = builtinPlants.map((p) => overrides[p.id] ?? p);
  return [...plants, ...loadCustomPlants()];
}

export function getPlant(id: string): PlantData | undefined {
  return getAllPlants().find((p) => p.id === id);
}

export function getPlantsByCategory(category: PlantData["category"]): PlantData[] {
  return getAllPlants().filter((p) => p.category === category);
}

export function searchPlants(query: string): PlantData[] {
  const lower = query.toLowerCase();
  return getAllPlants().filter((p) => p.name.toLowerCase().includes(lower));
}

export function addCustomPlant(plant: PlantData): void {
  const customs = loadCustomPlants();
  customs.push(plant);
  saveCustomPlants(customs);
}

export function updateCustomPlant(plant: PlantData): void {
  const customs = loadCustomPlants();
  const idx = customs.findIndex((p) => p.id === plant.id);
  if (idx >= 0) {
    customs[idx] = plant;
    saveCustomPlants(customs);
  }
}

export function removeCustomPlant(id: string): void {
  const customs = loadCustomPlants().filter((p) => p.id !== id);
  saveCustomPlants(customs);
}

export function isCustomPlant(id: string): boolean {
  return loadCustomPlants().some((p) => p.id === id);
}

import plantsData from "@/data/plants.json";
import { PlantData } from "./types";

const CUSTOM_PLANTS_KEY = "moestuin-custom-plants";

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

/** Alle planten: builtin + custom */
export function getAllPlants(): PlantData[] {
  return [...builtinPlants, ...loadCustomPlants()];
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

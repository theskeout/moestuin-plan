import plantsData from "@/data/plants.json";
import { PlantData } from "./types";
import { getPlantStorage } from "@/lib/storage";

export const builtinPlants: PlantData[] = plantsData as PlantData[];

// In-memory cache
let cachedCustomPlants: PlantData[] = [];
let cachedOverrides: Record<string, PlantData> = {};
let cacheInitialized = false;

const CUSTOM_PLANTS_KEY = "moestuin-custom-plants";
const PLANT_OVERRIDES_KEY = "moestuin-plant-overrides";

// Initialiseer cache vanuit localStorage (synchroon, voor app-start)
function initCacheFromLocalStorage() {
  if (cacheInitialized || typeof window === "undefined") return;
  try {
    const customData = localStorage.getItem(CUSTOM_PLANTS_KEY);
    cachedCustomPlants = customData ? JSON.parse(customData) as PlantData[] : [];
  } catch {
    cachedCustomPlants = [];
  }
  try {
    const overrideData = localStorage.getItem(PLANT_OVERRIDES_KEY);
    cachedOverrides = overrideData ? JSON.parse(overrideData) as Record<string, PlantData> : {};
  } catch {
    cachedOverrides = {};
  }
  cacheInitialized = true;
}

// Ververs cache vanuit actieve storage backend (async, na login)
export async function refreshPlantCache(): Promise<void> {
  const storage = getPlantStorage();
  cachedCustomPlants = await storage.loadCustomPlants();
  cachedOverrides = await storage.loadPlantOverrides();
  cacheInitialized = true;
}

// Read-functies: synchroon, lezen uit cache
export function getAllPlants(): PlantData[] {
  initCacheFromLocalStorage();
  const plants = builtinPlants.map((p) => cachedOverrides[p.id] ?? p);
  return [...plants, ...cachedCustomPlants];
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

export function isBuiltinPlant(id: string): boolean {
  return builtinPlants.some((p) => p.id === id);
}

export function hasOverride(id: string): boolean {
  initCacheFromLocalStorage();
  return id in cachedOverrides;
}

export function isCustomPlant(id: string): boolean {
  initCacheFromLocalStorage();
  return cachedCustomPlants.some((p) => p.id === id);
}

// Write-functies: async, updaten cache + storage
export async function addCustomPlant(plant: PlantData): Promise<void> {
  initCacheFromLocalStorage();
  cachedCustomPlants = [...cachedCustomPlants, plant];
  await getPlantStorage().saveCustomPlant(plant);
}

export async function updateCustomPlant(plant: PlantData): Promise<void> {
  initCacheFromLocalStorage();
  const idx = cachedCustomPlants.findIndex((p) => p.id === plant.id);
  if (idx >= 0) {
    cachedCustomPlants = cachedCustomPlants.map((p, i) => i === idx ? plant : p);
  }
  await getPlantStorage().updateCustomPlant(plant);
}

export async function removeCustomPlant(id: string): Promise<void> {
  initCacheFromLocalStorage();
  cachedCustomPlants = cachedCustomPlants.filter((p) => p.id !== id);
  await getPlantStorage().removeCustomPlant(id);
}

export async function savePlantOverride(plant: PlantData): Promise<void> {
  initCacheFromLocalStorage();
  cachedOverrides = { ...cachedOverrides, [plant.id]: plant };
  await getPlantStorage().savePlantOverride(plant);
}

export async function resetOverride(id: string): Promise<void> {
  initCacheFromLocalStorage();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [id]: _removed, ...rest } = cachedOverrides;
  cachedOverrides = rest;
  await getPlantStorage().resetOverride(id);
}

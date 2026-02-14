import plantsData from "@/data/plants.json";
import { PlantData } from "./types";

export const plants: PlantData[] = plantsData as PlantData[];

export function getPlant(id: string): PlantData | undefined {
  return plants.find((p) => p.id === id);
}

export function getPlantsByCategory(category: PlantData["category"]): PlantData[] {
  return plants.filter((p) => p.category === category);
}

export function searchPlants(query: string): PlantData[] {
  const lower = query.toLowerCase();
  return plants.filter((p) => p.name.toLowerCase().includes(lower));
}

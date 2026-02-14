import { Garden } from "@/lib/garden/types";
import { PlantData } from "@/lib/plants/types";

export interface GardenStorage {
  loadGardens(): Promise<Garden[]>;
  saveGarden(garden: Garden): Promise<void>;
  deleteGarden(id: string): Promise<void>;
}

export interface PlantStorage {
  loadCustomPlants(): Promise<PlantData[]>;
  saveCustomPlant(plant: PlantData): Promise<void>;
  updateCustomPlant(plant: PlantData): Promise<void>;
  removeCustomPlant(id: string): Promise<void>;
  loadPlantOverrides(): Promise<Record<string, PlantData>>;
  savePlantOverride(plant: PlantData): Promise<void>;
  resetOverride(id: string): Promise<void>;
}

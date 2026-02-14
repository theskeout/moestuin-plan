import { Garden, CropZone } from "@/lib/garden/types";
import { PlantData } from "@/lib/plants/types";
import { GardenStorage, PlantStorage } from "./types";
import { getDefaultZoneSize } from "@/lib/garden/helpers";
import { builtinPlants } from "@/lib/plants/catalog";

const GARDENS_KEY = "moestuin-plan-gardens";
const CUSTOM_PLANTS_KEY = "moestuin-custom-plants";
const PLANT_OVERRIDES_KEY = "moestuin-plant-overrides";

function getPlantForMigration(id: string): PlantData | undefined {
  return builtinPlants.find((p) => p.id === id);
}

function migrateGarden(g: Garden): Garden {
  if (g.zones) {
    return {
      ...g,
      plants: g.plants || [],
      zones: g.zones.map((z) => ({ ...z, locked: z.locked ?? false })),
      structures: (g.structures || []).map((s) => ({ ...s, locked: s.locked ?? false })),
    };
  }

  const zones: CropZone[] = (g.plants || []).map((p) => {
    const plantData = getPlantForMigration(p.plantId);
    const size = plantData
      ? getDefaultZoneSize(plantData)
      : { widthCm: 30, heightCm: 30 };
    return {
      id: p.id,
      plantId: p.plantId,
      x: p.x - size.widthCm / 2,
      y: p.y - size.heightCm / 2,
      widthCm: size.widthCm,
      heightCm: size.heightCm,
      rotation: p.rotation,
      locked: false,
    };
  });

  return {
    ...g,
    zones,
    structures: (g.structures || []).map((s) => ({ ...s, locked: s.locked ?? false })),
    plants: g.plants || [],
  };
}

export class LocalGardenStorage implements GardenStorage {
  async loadGardens(): Promise<Garden[]> {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(GARDENS_KEY);
    if (!data) return [];
    try {
      const raw = JSON.parse(data) as Garden[];
      return raw.map(migrateGarden);
    } catch {
      return [];
    }
  }

  async saveGarden(garden: Garden): Promise<void> {
    if (typeof window === "undefined") return;
    const gardens = await this.loadGardens();
    const index = gardens.findIndex((g) => g.id === garden.id);
    if (index >= 0) {
      gardens[index] = { ...garden, updatedAt: new Date().toISOString() };
    } else {
      gardens.push(garden);
    }
    localStorage.setItem(GARDENS_KEY, JSON.stringify(gardens));
  }

  async deleteGarden(id: string): Promise<void> {
    if (typeof window === "undefined") return;
    const gardens = (await this.loadGardens()).filter((g) => g.id !== id);
    localStorage.setItem(GARDENS_KEY, JSON.stringify(gardens));
  }
}

export class LocalPlantStorage implements PlantStorage {
  async loadCustomPlants(): Promise<PlantData[]> {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(CUSTOM_PLANTS_KEY);
      if (!data) return [];
      return JSON.parse(data) as PlantData[];
    } catch {
      return [];
    }
  }

  async saveCustomPlant(plant: PlantData): Promise<void> {
    if (typeof window === "undefined") return;
    const customs = await this.loadCustomPlants();
    customs.push(plant);
    localStorage.setItem(CUSTOM_PLANTS_KEY, JSON.stringify(customs));
  }

  async updateCustomPlant(plant: PlantData): Promise<void> {
    if (typeof window === "undefined") return;
    const customs = await this.loadCustomPlants();
    const idx = customs.findIndex((p) => p.id === plant.id);
    if (idx >= 0) {
      customs[idx] = plant;
      localStorage.setItem(CUSTOM_PLANTS_KEY, JSON.stringify(customs));
    }
  }

  async removeCustomPlant(id: string): Promise<void> {
    if (typeof window === "undefined") return;
    const customs = (await this.loadCustomPlants()).filter((p) => p.id !== id);
    localStorage.setItem(CUSTOM_PLANTS_KEY, JSON.stringify(customs));
  }

  async loadPlantOverrides(): Promise<Record<string, PlantData>> {
    if (typeof window === "undefined") return {};
    try {
      const data = localStorage.getItem(PLANT_OVERRIDES_KEY);
      if (!data) return {};
      return JSON.parse(data) as Record<string, PlantData>;
    } catch {
      return {};
    }
  }

  async savePlantOverride(plant: PlantData): Promise<void> {
    if (typeof window === "undefined") return;
    const overrides = await this.loadPlantOverrides();
    overrides[plant.id] = plant;
    localStorage.setItem(PLANT_OVERRIDES_KEY, JSON.stringify(overrides));
  }

  async resetOverride(id: string): Promise<void> {
    if (typeof window === "undefined") return;
    const overrides = await this.loadPlantOverrides();
    delete overrides[id];
    localStorage.setItem(PLANT_OVERRIDES_KEY, JSON.stringify(overrides));
  }
}

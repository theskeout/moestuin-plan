import familiesData from "@/data/plant-families.json";
import { PlantFamily } from "./types";

const familyMap = new Map<string, PlantFamily>();
const plantToFamily = new Map<string, PlantFamily>();

// Bouw lookup maps bij eerste import
for (const [id, data] of Object.entries(familiesData)) {
  const family: PlantFamily = { id, ...data };
  familyMap.set(id, family);
  for (const plantId of data.plants) {
    plantToFamily.set(plantId, family);
  }
}

export function getPlantFamily(plantId: string): PlantFamily | null {
  return plantToFamily.get(plantId) ?? null;
}

export function areSameFamily(plantIdA: string, plantIdB: string): boolean {
  const a = plantToFamily.get(plantIdA);
  const b = plantToFamily.get(plantIdB);
  if (!a || !b) return false;
  return a.id === b.id;
}

export function getAllFamilies(): PlantFamily[] {
  return Array.from(familyMap.values());
}

export function getFamilyById(familyId: string): PlantFamily | null {
  return familyMap.get(familyId) ?? null;
}

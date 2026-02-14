import { Garden, CropZone } from "./types";
import { getDefaultZoneSize } from "./helpers";
import { getPlant } from "@/lib/plants/catalog";

const STORAGE_KEY = "moestuin-plan-gardens";

/** Migreer oude tuinen: plants[] → zones[] als zones ontbreekt */
function migrateGarden(g: Garden): Garden {
  // Al gemigreerd
  if (g.zones) {
    return {
      ...g,
      plants: g.plants || [],
      zones: g.zones.map((z) => ({ ...z, locked: z.locked ?? false })),
      structures: (g.structures || []).map((s) => ({ ...s, locked: s.locked ?? false })),
    };
  }

  const zones: CropZone[] = (g.plants || []).map((p) => {
    const plantData = getPlant(p.plantId);
    const size = plantData
      ? getDefaultZoneSize(plantData)
      : { widthCm: 30, heightCm: 30 };
    return {
      id: p.id,
      plantId: p.plantId,
      x: p.x - size.widthCm / 2,  // center → linkerboven
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

export function saveGardens(gardens: Garden[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gardens));
}

export function loadGardens(): Garden[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    const raw = JSON.parse(data) as Garden[];
    return raw.map(migrateGarden);
  } catch {
    return [];
  }
}

export function saveGarden(garden: Garden): void {
  const gardens = loadGardens();
  const index = gardens.findIndex((g) => g.id === garden.id);
  if (index >= 0) {
    gardens[index] = { ...garden, updatedAt: new Date().toISOString() };
  } else {
    gardens.push(garden);
  }
  saveGardens(gardens);
}

export function deleteGarden(id: string): void {
  const gardens = loadGardens().filter((g) => g.id !== id);
  saveGardens(gardens);
}

export function exportGarden(garden: Garden): string {
  return JSON.stringify(garden, null, 2);
}

export function importGarden(json: string): Garden | null {
  try {
    const garden = JSON.parse(json) as Garden;
    if (!garden.id || !garden.name || !garden.shape) {
      return null;
    }
    return migrateGarden(garden);
  } catch {
    return null;
  }
}

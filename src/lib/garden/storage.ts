import { Garden, CropZone } from "./types";
import { getDefaultZoneSize } from "./helpers";
import { getPlant } from "@/lib/plants/catalog";
import { getGardenStorage } from "@/lib/storage";

const STORAGE_KEY = "moestuin-plan-gardens";

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
    const plantData = getPlant(p.plantId);
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

// Synchrone localStorage functies voor directe toegang (vangnet bij beforeunload)
export function saveGardenSync(garden: Garden): void {
  if (typeof window === "undefined") return;
  const data = localStorage.getItem(STORAGE_KEY);
  let gardens: Garden[] = [];
  try {
    gardens = data ? (JSON.parse(data) as Garden[]) : [];
  } catch { /* noop */ }
  const index = gardens.findIndex((g) => g.id === garden.id);
  if (index >= 0) {
    gardens[index] = { ...garden, updatedAt: new Date().toISOString() };
  } else {
    gardens.push(garden);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gardens));
}

// Async functies die delegeren naar de actieve storage backend
export async function loadGardensAsync(): Promise<Garden[]> {
  return getGardenStorage().loadGardens();
}

export async function saveGardenAsync(garden: Garden): Promise<void> {
  return getGardenStorage().saveGarden(garden);
}

export async function deleteGardenAsync(id: string): Promise<void> {
  return getGardenStorage().deleteGarden(id);
}

// Synchroon laden vanuit localStorage (voor initieel laden en fallback)
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

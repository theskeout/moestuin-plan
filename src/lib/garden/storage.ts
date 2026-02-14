import { Garden } from "./types";

const STORAGE_KEY = "moestuin-plan-gardens";

export function saveGardens(gardens: Garden[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gardens));
}

export function loadGardens(): Garden[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as Garden[];
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
    if (!garden.id || !garden.name || !garden.shape || !garden.plants) {
      return null;
    }
    return garden;
  } catch {
    return null;
  }
}

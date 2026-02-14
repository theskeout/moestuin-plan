import { GardenStorage, PlantStorage } from "./types";
import { LocalGardenStorage, LocalPlantStorage } from "./localStorage";
import { SupabaseGardenStorage, SupabasePlantStorage } from "./supabase";
import { createClient } from "@/lib/supabase/client";

type StorageBackend = "local" | "supabase";

let currentBackend: StorageBackend = "local";
let currentUserId: string | null = null;

let gardenStorage: GardenStorage = new LocalGardenStorage();
let plantStorage: PlantStorage = new LocalPlantStorage();

export function setStorageBackend(backend: StorageBackend, userId?: string) {
  currentBackend = backend;
  currentUserId = userId ?? null;

  if (backend === "supabase" && userId) {
    const supabase = createClient();
    gardenStorage = new SupabaseGardenStorage(supabase, userId);
    plantStorage = new SupabasePlantStorage(supabase, userId);
  } else {
    gardenStorage = new LocalGardenStorage();
    plantStorage = new LocalPlantStorage();
  }
}

export function getGardenStorage(): GardenStorage {
  return gardenStorage;
}

export function getPlantStorage(): PlantStorage {
  return plantStorage;
}

export function getCurrentBackend(): StorageBackend {
  return currentBackend;
}

export function isLoggedIn(): boolean {
  return currentBackend === "supabase" && currentUserId !== null;
}

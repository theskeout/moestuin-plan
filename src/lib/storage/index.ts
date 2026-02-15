import { GardenStorage, PlantStorage } from "./types";
import { LocalGardenStorage, LocalPlantStorage } from "./localStorage";
import { SupabaseGardenStorage, SupabasePlantStorage } from "./supabase";
import { LocalPlanningStorage, SupabasePlanningStorage } from "./planning";
import { PlanningStorage } from "@/lib/planning/types";
import { createClient } from "@/lib/supabase/client";

type StorageBackend = "local" | "supabase";

let currentBackend: StorageBackend = "local";
let currentUserId: string | null = null;

let gardenStorage: GardenStorage = new LocalGardenStorage();
let plantStorage: PlantStorage = new LocalPlantStorage();
let planningStorage: PlanningStorage = new LocalPlanningStorage();

export function setStorageBackend(backend: StorageBackend, userId?: string) {
  currentBackend = backend;
  currentUserId = userId ?? null;

  if (backend === "supabase" && userId) {
    const supabase = createClient();
    gardenStorage = new SupabaseGardenStorage(supabase, userId);
    plantStorage = new SupabasePlantStorage(supabase, userId);
    planningStorage = new SupabasePlanningStorage(supabase, userId);
  } else {
    gardenStorage = new LocalGardenStorage();
    plantStorage = new LocalPlantStorage();
    planningStorage = new LocalPlanningStorage();
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

export function getPlanningStorage(): PlanningStorage {
  return planningStorage;
}

export function isLoggedIn(): boolean {
  return currentBackend === "supabase" && currentUserId !== null;
}

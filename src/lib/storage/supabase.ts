import { SupabaseClient } from "@supabase/supabase-js";
import { Garden } from "@/lib/garden/types";
import { PlantData } from "@/lib/plants/types";
import { GardenStorage, PlantStorage } from "./types";

// camelCase ↔ snake_case mapping for gardens
interface GardenRow {
  id: string;
  user_id: string;
  name: string;
  width_cm: number;
  height_cm: number;
  shape: Garden["shape"];
  zones: Garden["zones"];
  structures: Garden["structures"];
  plants: Garden["plants"];
  created_at: string;
  updated_at: string;
}

function rowToGarden(row: GardenRow): Garden {
  return {
    id: row.id,
    name: row.name,
    widthCm: row.width_cm,
    heightCm: row.height_cm,
    shape: row.shape,
    zones: (row.zones || []).map((z) => ({ ...z, locked: z.locked ?? false })),
    structures: (row.structures || []).map((s) => ({ ...s, locked: s.locked ?? false })),
    plants: row.plants || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function gardenToRow(garden: Garden, userId: string): Omit<GardenRow, "created_at"> {
  return {
    id: garden.id,
    user_id: userId,
    name: garden.name,
    width_cm: garden.widthCm,
    height_cm: garden.heightCm,
    shape: garden.shape,
    zones: garden.zones,
    structures: garden.structures,
    plants: garden.plants,
    updated_at: new Date().toISOString(),
  };
}

export class SupabaseGardenStorage implements GardenStorage {
  constructor(
    private supabase: SupabaseClient,
    private userId: string
  ) {}

  async loadGardens(): Promise<Garden[]> {
    const { data, error } = await this.supabase
      .from("gardens")
      .select("*")
      .eq("user_id", this.userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(rowToGarden);
  }

  async saveGarden(garden: Garden): Promise<void> {
    const row = gardenToRow(garden, this.userId);
    const { error } = await this.supabase
      .from("gardens")
      .upsert(row, { onConflict: "id" });

    if (error) throw error;
  }

  async deleteGarden(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("gardens")
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId);

    if (error) throw error;
  }
}

export class SupabasePlantStorage implements PlantStorage {
  constructor(
    private supabase: SupabaseClient,
    private userId: string
  ) {}

  async loadCustomPlants(): Promise<PlantData[]> {
    const { data, error } = await this.supabase
      .from("custom_plants")
      .select("data")
      .eq("user_id", this.userId);

    if (error) throw error;
    return (data || []).map((row) => row.data as PlantData);
  }

  async saveCustomPlant(plant: PlantData): Promise<void> {
    const { error } = await this.supabase
      .from("custom_plants")
      .upsert({ id: plant.id, user_id: this.userId, data: plant }, { onConflict: "id,user_id" });

    if (error) throw error;
  }

  async updateCustomPlant(plant: PlantData): Promise<void> {
    const { error } = await this.supabase
      .from("custom_plants")
      .update({ data: plant })
      .eq("id", plant.id)
      .eq("user_id", this.userId);

    if (error) throw error;
  }

  async removeCustomPlant(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("custom_plants")
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId);

    if (error) throw error;
  }

  async loadPlantOverrides(): Promise<Record<string, PlantData>> {
    const { data, error } = await this.supabase
      .from("plant_overrides")
      .select("plant_id, data")
      .eq("user_id", this.userId);

    if (error) throw error;
    const overrides: Record<string, PlantData> = {};
    for (const row of data || []) {
      overrides[row.plant_id] = row.data as PlantData;
    }
    return overrides;
  }

  async savePlantOverride(plant: PlantData): Promise<void> {
    const { error } = await this.supabase
      .from("plant_overrides")
      .upsert(
        { plant_id: plant.id, user_id: this.userId, data: plant },
        { onConflict: "plant_id,user_id" }
      );

    if (error) throw error;
  }

  async resetOverride(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("plant_overrides")
      .delete()
      .eq("plant_id", id)
      .eq("user_id", this.userId);

    if (error) throw error;
  }
}

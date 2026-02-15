import { SupabaseClient } from "@supabase/supabase-js";
import {
  PlanningStorage,
  UserSettings,
  SeasonArchive,
  ArchivedZone,
} from "@/lib/planning/types";

const USER_SETTINGS_KEY = "moestuin-user-settings";
const SEASON_ARCHIVES_KEY = "moestuin-season-archives";

function archivesKey(gardenId: string): string {
  return `${SEASON_ARCHIVES_KEY}-${gardenId}`;
}

// --- localStorage implementatie ---

export class LocalPlanningStorage implements PlanningStorage {
  async loadUserSettings(): Promise<UserSettings> {
    if (typeof window === "undefined") return {};
    try {
      const data = localStorage.getItem(USER_SETTINGS_KEY);
      if (!data) return {};
      return JSON.parse(data) as UserSettings;
    } catch {
      return {};
    }
  }

  async saveUserSettings(settings: UserSettings): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settings));
  }

  async loadSeasonArchives(gardenId: string): Promise<SeasonArchive[]> {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(archivesKey(gardenId));
      if (!data) return [];
      return JSON.parse(data) as SeasonArchive[];
    } catch {
      return [];
    }
  }

  async saveSeasonArchive(
    gardenId: string,
    year: number,
    zones: ArchivedZone[]
  ): Promise<void> {
    if (typeof window === "undefined") return;
    const archives = await this.loadSeasonArchives(gardenId);
    const existing = archives.findIndex(
      (a) => a.gardenId === gardenId && a.seasonYear === year
    );

    const archive: SeasonArchive = {
      id: `${gardenId}-${year}`,
      gardenId,
      seasonYear: year,
      zones,
      createdAt: new Date().toISOString(),
    };

    if (existing >= 0) {
      archives[existing] = archive;
    } else {
      archives.push(archive);
    }

    localStorage.setItem(archivesKey(gardenId), JSON.stringify(archives));
  }

  async deleteSeasonArchive(gardenId: string, year: number): Promise<void> {
    if (typeof window === "undefined") return;
    const archives = (await this.loadSeasonArchives(gardenId)).filter(
      (a) => a.seasonYear !== year
    );
    localStorage.setItem(archivesKey(gardenId), JSON.stringify(archives));
  }
}

// --- Supabase implementatie ---

export class SupabasePlanningStorage implements PlanningStorage {
  constructor(
    private supabase: SupabaseClient,
    private userId: string
  ) {}

  async loadUserSettings(): Promise<UserSettings> {
    const { data, error } = await this.supabase
      .from("user_settings")
      .select("knmi_station_code, postcode, frost_offset_days")
      .eq("user_id", this.userId)
      .maybeSingle();

    if (error || !data) return {};
    return {
      knmiStationCode: data.knmi_station_code ?? undefined,
      postcode: data.postcode ?? undefined,
      frostOffsetDays: data.frost_offset_days ?? 0,
    };
  }

  async saveUserSettings(settings: UserSettings): Promise<void> {
    const { error } = await this.supabase
      .from("user_settings")
      .upsert({
        user_id: this.userId,
        knmi_station_code: settings.knmiStationCode ?? null,
        postcode: settings.postcode ?? null,
        frost_offset_days: settings.frostOffsetDays ?? 0,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
  }

  async loadSeasonArchives(gardenId: string): Promise<SeasonArchive[]> {
    const { data, error } = await this.supabase
      .from("season_archives")
      .select("*")
      .eq("garden_id", gardenId)
      .order("season_year", { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      gardenId: row.garden_id,
      seasonYear: row.season_year,
      zones: row.zones as ArchivedZone[],
      createdAt: row.created_at,
    }));
  }

  async saveSeasonArchive(
    gardenId: string,
    year: number,
    zones: ArchivedZone[]
  ): Promise<void> {
    const { error } = await this.supabase
      .from("season_archives")
      .upsert(
        {
          garden_id: gardenId,
          season_year: year,
          zones,
        },
        { onConflict: "garden_id,season_year" }
      );

    if (error) throw error;
  }

  async deleteSeasonArchive(gardenId: string, year: number): Promise<void> {
    const { error } = await this.supabase
      .from("season_archives")
      .delete()
      .eq("garden_id", gardenId)
      .eq("season_year", year);

    if (error) throw error;
  }
}

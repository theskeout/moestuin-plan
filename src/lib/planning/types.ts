export interface PlantFamily {
  id: string;
  name: string;
  rotationYears: number;
  plants: string[];
}

export interface MaintenanceTask {
  id: string;
  name: string;
  frequency: "once" | "daily" | "weekly" | "biweekly" | "monthly" | "yearly";
  phase?: string;
  description?: string;
  months?: number[];
}

export interface PestWarning {
  id: string;
  name: string;
  months: number[];
  description: string;
}

export interface WateringInfo {
  frequencyDays: number;
  description: string;
}

export interface PlantTypeData {
  plants: string[];
  tasks: MaintenanceTask[];
  warnings: PestWarning[];
}

export interface SeasonArchive {
  id: string;
  gardenId: string;
  seasonYear: number;
  zones: ArchivedZone[];
  createdAt: string;
}

export interface ArchivedZone {
  zoneId: string;
  plantId: string;
  plantName: string;
  familyId?: string;
  x: number;
  y: number;
  widthCm: number;
  heightCm: number;
}

export interface UserSettings {
  knmiStationCode?: string;
  postcode?: string;
  frostOffsetDays?: number;
}

export interface KnmiStation {
  code: string;
  name: string;
  lat: number;
  lon: number;
  avgLastFrostDate: string;
  avgFirstFrostDate: string;
}

export interface MonthlyTask {
  zoneId: string;
  plantId: string;
  plantName: string;
  plantIcon: string;
  type: "sow-indoor" | "sow-outdoor" | "harvest" | "maintenance" | "warning";
  task: MaintenanceTask | PestWarning;
  completed?: boolean;
}

export interface RotationWarning {
  zoneId: string;
  plantId: string;
  plantName: string;
  familyId: string;
  familyName: string;
  conflictYear: number;
  conflictPlant: string;
  rotationYears: number;
}

export interface HistoryEntry {
  year: number;
  plantId: string;
  plantName: string;
  familyId?: string;
}

export interface PlanningStorage {
  loadUserSettings(): Promise<UserSettings>;
  saveUserSettings(settings: UserSettings): Promise<void>;
  loadSeasonArchives(gardenId: string): Promise<SeasonArchive[]>;
  saveSeasonArchive(gardenId: string, year: number, zones: ArchivedZone[]): Promise<void>;
  deleteSeasonArchive(gardenId: string, year: number): Promise<void>;
}

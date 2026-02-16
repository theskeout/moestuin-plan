export type PlantCategory = "groente" | "fruit" | "kruiden" | "sier";
export type SunNeed = "vol" | "halfschaduw" | "schaduw";
export type WaterNeed = "laag" | "gemiddeld" | "hoog";

export interface MonthRange {
  start: number; // 1-12
  end: number;   // 1-12
}

export interface CompanionInfo {
  good: string[]; // plant IDs
  bad: string[];   // plant IDs
}

export interface PlantData {
  id: string;
  name: string;
  icon: string; // emoji
  color: string; // hex color
  category: PlantCategory;
  sowIndoor: MonthRange | null;
  sowOutdoor: MonthRange | null;
  harvest: MonthRange | null;
  spacingCm: number;
  rowSpacingCm: number;
  sunNeed: SunNeed;
  waterNeed: WaterNeed;
  companions: CompanionInfo;
}

import stationData from "@/data/knmi-stations.json";
import { KnmiStation, UserSettings } from "./types";

const stations: KnmiStation[] = stationData.stations;
const postcodeRanges = stationData.postcodeRanges as Record<string, string>;

export function getAllStations(): KnmiStation[] {
  return stations;
}

export function getStationByCode(code: string): KnmiStation | null {
  return stations.find((s) => s.code === code) ?? null;
}

export function getStationByPostcode(postcode: string): KnmiStation | null {
  // Neem eerste 4 cijfers van postcode
  const digits = postcode.replace(/\D/g, "").substring(0, 4);
  if (digits.length < 4) return null;

  const num = parseInt(digits, 10);

  // Zoek de juiste range
  for (const [range, stationCode] of Object.entries(postcodeRanges)) {
    const [start, end] = range.split("-").map(Number);
    if (num >= start && num <= end) {
      return getStationByCode(stationCode);
    }
  }

  // Fallback: De Bilt
  return getStationByCode("260");
}

export function parseFrostDate(dateStr: string, year: number): Date {
  const [month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getLastFrostDate(stationCode: string, year?: number): Date {
  const station = getStationByCode(stationCode);
  if (!station) return parseFrostDate("04-20", year ?? new Date().getFullYear());
  return parseFrostDate(station.avgLastFrostDate, year ?? new Date().getFullYear());
}

export function getFirstFrostDate(stationCode: string, year?: number): Date {
  const station = getStationByCode(stationCode);
  if (!station) return parseFrostDate("10-25", year ?? new Date().getFullYear());
  return parseFrostDate(station.avgFirstFrostDate, year ?? new Date().getFullYear());
}

/**
 * Verschuift een zaaimaand op basis van regio.
 * Vergelijkt met De Bilt (referentie) en berekent verschil in vorstdata.
 * Retourneert aangepaste maand (1-12).
 */
export function adjustSowingMonth(month: number, settings?: UserSettings): number {
  if (!settings?.knmiStationCode) return month;

  const referenceStation = getStationByCode("260"); // De Bilt
  const userStation = getStationByCode(settings.knmiStationCode);
  if (!referenceStation || !userStation) return month;

  const year = new Date().getFullYear();
  const refFrost = parseFrostDate(referenceStation.avgLastFrostDate, year);
  const userFrost = parseFrostDate(userStation.avgLastFrostDate, year);

  // Verschil in dagen
  let diffDays = Math.round((userFrost.getTime() - refFrost.getTime()) / (1000 * 60 * 60 * 24));

  // Voeg handmatige correctie toe
  if (settings.frostOffsetDays) {
    diffDays += settings.frostOffsetDays;
  }

  // Rond af naar weken en converteer naar maandverschuiving
  // Positief = later, negatief = eerder
  if (Math.abs(diffDays) < 10) return month;

  // Verschuif de maand als verschil > 2 weken
  const monthShift = diffDays > 14 ? 1 : diffDays < -14 ? -1 : 0;

  const adjusted = month + monthShift;
  if (adjusted < 1) return 1;
  if (adjusted > 12) return 12;
  return adjusted;
}

/**
 * Verschuift een zaaiweek op basis van regio.
 * Zelfde logica als adjustSowingMonth maar op weekniveau.
 * Berekent dagenverschil, deelt door 7 → weekshift.
 */
export function adjustSowingWeek(week: number, settings?: UserSettings): number {
  if (!settings?.knmiStationCode) return week;

  const referenceStation = getStationByCode("260"); // De Bilt
  const userStation = getStationByCode(settings.knmiStationCode);
  if (!referenceStation || !userStation) return week;

  const year = new Date().getFullYear();
  const refFrost = parseFrostDate(referenceStation.avgLastFrostDate, year);
  const userFrost = parseFrostDate(userStation.avgLastFrostDate, year);

  let diffDays = Math.round((userFrost.getTime() - refFrost.getTime()) / (1000 * 60 * 60 * 24));

  if (settings.frostOffsetDays) {
    diffDays += settings.frostOffsetDays;
  }

  const weekShift = Math.round(diffDays / 7);
  const adjusted = week + weekShift;
  if (adjusted < 1) return 1;
  if (adjusted > 53) return 53;
  return adjusted;
}

export function getRegionDescription(settings?: UserSettings): string {
  if (!settings?.knmiStationCode) return "Standaard (De Bilt)";
  const station = getStationByCode(settings.knmiStationCode);
  if (!station) return "Onbekend station";
  return station.name;
}

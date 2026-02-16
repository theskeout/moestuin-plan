"use client";

import { useMemo } from "react";
import { Garden } from "@/lib/garden/types";
import { PlantData, MonthRange } from "@/lib/plants/types";
import { getPlant } from "@/lib/plants/catalog";
import { adjustSowingMonth } from "@/lib/planning/frost";
import { UserSettings } from "@/lib/planning/types";

const MONTHS = ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

function isInRange(month: number, range: MonthRange | null): boolean {
  if (!range) return false;
  if (range.start <= range.end) return month >= range.start && month <= range.end;
  return month >= range.start || month <= range.end;
}

function adjustRange(range: MonthRange | null, settings?: UserSettings): MonthRange | null {
  if (!range) return null;
  return {
    start: adjustSowingMonth(range.start, settings),
    end: adjustSowingMonth(range.end, settings),
  };
}

interface CalendarGridProps {
  garden: Garden;
  settings?: UserSettings;
  onSelectZone?: (zoneId: string) => void;
}

export default function CalendarGrid({ garden, settings, onSelectZone }: CalendarGridProps) {
  const currentMonth = new Date().getMonth() + 1;

  const rows = useMemo(() => {
    // Deduplicate per plant (toon elke plant maar 1x)
    const seen = new Set<string>();
    const result: { zoneId: string; plant: PlantData; sowIndoor: MonthRange | null; sowOutdoor: MonthRange | null; harvest: MonthRange | null }[] = [];

    for (const zone of garden.zones) {
      if (seen.has(zone.plantId)) continue;
      seen.add(zone.plantId);
      const plant = getPlant(zone.plantId);
      if (!plant) continue;
      result.push({
        zoneId: zone.id,
        plant,
        sowIndoor: adjustRange(plant.sowIndoor, settings),
        sowOutdoor: adjustRange(plant.sowOutdoor, settings),
        harvest: plant.harvest,
      });
    }
    return result;
  }, [garden.zones, settings]);

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        Voeg gewassen toe aan je tuin om de kalender te zien
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Legenda */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground px-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-purple-200" />
          <span>Binnen zaaien</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-200" />
          <span>Buiten zaaien</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-200" />
          <span>Oogsten</span>
        </div>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left py-2 px-2 w-32 font-medium text-muted-foreground sticky left-0 bg-white z-10">
              Gewas
            </th>
            {MONTHS.map((m, i) => (
              <th
                key={m}
                className={`py-2 px-1 text-center font-medium w-12 ${i + 1 === currentMonth ? "text-blue-600 bg-blue-50" : "text-muted-foreground"}`}
              >
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ zoneId, plant, sowIndoor, sowOutdoor, harvest }) => (
            <tr
              key={plant.id}
              className="border-t hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => onSelectZone?.(zoneId)}
            >
              <td className="py-1.5 px-2 sticky left-0 bg-white z-10">
                <div className="flex items-center gap-1.5">
                  <span>{plant.icon}</span>
                  <span className="truncate font-medium">{plant.name}</span>
                </div>
              </td>
              {MONTHS.map((_, i) => {
                const month = i + 1;
                const isSowIndoor = isInRange(month, sowIndoor);
                const isSowOutdoor = isInRange(month, sowOutdoor);
                const isHarvest = isInRange(month, harvest);
                const isCurrent = month === currentMonth;

                let bg = "";
                let label = "";
                if (isSowIndoor && isHarvest) {
                  bg = "bg-gradient-to-r from-purple-200 to-orange-200";
                  label = "Z/O";
                } else if (isSowOutdoor && isHarvest) {
                  bg = "bg-gradient-to-r from-green-200 to-orange-200";
                  label = "Z/O";
                } else if (isSowIndoor) {
                  bg = "bg-purple-200";
                  label = "Bin";
                } else if (isSowOutdoor) {
                  bg = "bg-green-200";
                  label = "Bui";
                } else if (isHarvest) {
                  bg = "bg-orange-200";
                  label = "Oogst";
                }

                return (
                  <td
                    key={i}
                    className={`py-1.5 px-0.5 text-center ${bg} ${isCurrent ? "ring-1 ring-inset ring-blue-400" : ""}`}
                  >
                    {label && (
                      <span className="text-[10px] font-medium text-gray-700">
                        {label}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      </div>
    </div>
  );
}

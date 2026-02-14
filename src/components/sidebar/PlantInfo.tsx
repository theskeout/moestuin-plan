"use client";

import { PlantData } from "@/lib/plants/types";
import { Sun, Droplets, Calendar, Ruler } from "lucide-react";

interface PlantInfoProps {
  plant: PlantData;
  onClose: () => void;
  compact?: boolean;
}

const MONTHS = [
  "Jan", "Feb", "Mrt", "Apr", "Mei", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dec",
];

function formatMonthRange(range: { start: number; end: number } | null): string {
  if (!range) return "—";
  if (range.start <= range.end) {
    return `${MONTHS[range.start - 1]} – ${MONTHS[range.end - 1]}`;
  }
  return `${MONTHS[range.start - 1]} – ${MONTHS[range.end - 1]} (doorlopend)`;
}

function sunLabel(s: PlantData["sunNeed"]): string {
  const map = { vol: "Volle zon", halfschaduw: "Halfschaduw", schaduw: "Schaduw" };
  return map[s];
}

function waterLabel(w: PlantData["waterNeed"]): string {
  const map = { laag: "Weinig", gemiddeld: "Gemiddeld", hoog: "Veel" };
  return map[w];
}

export default function PlantInfo({ plant, onClose, compact }: PlantInfoProps) {
  const content = (
    <>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-1.5">
          <Sun className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span>{sunLabel(plant.sunNeed)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Droplets className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span>{waterLabel(plant.waterNeed)}</span>
        </div>
        <div className="flex items-center gap-1.5 col-span-2">
          <Ruler className="h-3.5 w-3.5 text-gray-500 shrink-0" />
          <span>{plant.spacingCm}cm plant / {plant.rowSpacingCm}cm rij</span>
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-green-600 shrink-0" />
          <span className="text-muted-foreground">Binnen zaaien:</span>
          <span>{formatMonthRange(plant.sowIndoor)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-green-700 shrink-0" />
          <span className="text-muted-foreground">Buiten zaaien:</span>
          <span>{formatMonthRange(plant.sowOutdoor)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-orange-500 shrink-0" />
          <span className="text-muted-foreground">Oogst:</span>
          <span>{formatMonthRange(plant.harvest)}</span>
        </div>
      </div>

      {plant.companions.good.length > 0 && (
        <div className="text-sm">
          <span className="text-green-600 font-medium">Goede buren: </span>
          <span>{plant.companions.good.join(", ")}</span>
        </div>
      )}
      {plant.companions.bad.length > 0 && (
        <div className="text-sm">
          <span className="text-red-600 font-medium">Slechte buren: </span>
          <span>{plant.companions.bad.join(", ")}</span>
        </div>
      )}
    </>
  );

  if (compact) {
    return <div className="space-y-2">{content}</div>;
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{plant.icon}</span>
          <h3 className="font-semibold">{plant.name}</h3>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          sluiten
        </button>
      </div>
      {content}
    </div>
  );
}

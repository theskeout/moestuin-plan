"use client";

import { useState, useMemo } from "react";
import { PlantData, MonthRange, PlantCategory } from "@/lib/plants/types";
import { adjustSowingMonth } from "@/lib/planning/frost";
import { UserSettings } from "@/lib/planning/types";
import { Search, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import allPlantsJson from "@/data/plants.json";

const allPlants = allPlantsJson as PlantData[];
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

interface DiscoverCalendarProps {
  settings?: UserSettings;
  onAddPlant?: (plantId: string) => void;
}

export default function DiscoverCalendar({ settings, onAddPlant }: DiscoverCalendarProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<PlantCategory | "alle">("alle");
  const currentMonth = new Date().getMonth() + 1;

  const categories: { key: PlantCategory | "alle"; label: string }[] = [
    { key: "alle", label: "Alle" },
    { key: "groente", label: "Groente" },
    { key: "fruit", label: "Fruit" },
    { key: "kruiden", label: "Kruiden" },
    { key: "sier", label: "Sier" },
  ];

  const filtered = useMemo(() => {
    let plants = allPlants;
    if (category !== "alle") {
      plants = plants.filter((p) => p.category === category);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      plants = plants.filter((p) => p.name.toLowerCase().includes(q));
    }
    return plants;
  }, [search, category]);

  return (
    <div className="space-y-4">
      {/* Zoek en filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Zoek gewas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 pr-8 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-accent"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 flex-wrap">
        {categories.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              category === key
                ? "bg-foreground text-background"
                : "bg-accent text-foreground hover:bg-accent/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} gewassen</p>

      {/* Tabel */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left py-2 px-2 w-36 font-medium text-muted-foreground sticky left-0 bg-white z-10">
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
              {onAddPlant && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {filtered.map((plant) => {
              const sowIndoor = adjustRange(plant.sowIndoor, settings);
              const sowOutdoor = adjustRange(plant.sowOutdoor, settings);
              const harvest = plant.harvest;

              return (
                <tr key={plant.id} className="border-t hover:bg-accent/30 transition-colors">
                  <td className="py-1.5 px-2 sticky left-0 bg-white z-10">
                    <div className="flex items-center gap-1.5">
                      <span>{plant.icon}</span>
                      <span className="truncate font-medium">{plant.name}</span>
                    </div>
                  </td>
                  {MONTHS.map((_, i) => {
                    const month = i + 1;
                    const isSI = isInRange(month, sowIndoor);
                    const isSO = isInRange(month, sowOutdoor);
                    const isH = isInRange(month, harvest);
                    const isCurrent = month === currentMonth;

                    let bg = "";
                    if (isSI && isH) bg = "bg-gradient-to-r from-purple-200 to-orange-200";
                    else if (isSO && isH) bg = "bg-gradient-to-r from-green-200 to-orange-200";
                    else if (isSI) bg = "bg-purple-200";
                    else if (isSO) bg = "bg-green-200";
                    else if (isH) bg = "bg-orange-200";

                    return (
                      <td
                        key={i}
                        className={`py-1.5 px-0.5 text-center ${bg} ${isCurrent ? "ring-1 ring-inset ring-blue-400" : ""}`}
                      />
                    );
                  })}
                  {onAddPlant && (
                    <td className="py-1 px-1 text-center">
                      <button
                        onClick={() => onAddPlant(plant.id)}
                        className="p-1 rounded hover:bg-accent transition-colors"
                        title="Toevoegen aan tuin"
                      >
                        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
    </div>
  );
}

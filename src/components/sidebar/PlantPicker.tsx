"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { searchPlants, getPlantsByCategory } from "@/lib/plants/catalog";
import { PlantData, PlantCategory } from "@/lib/plants/types";
import { StructureType } from "@/lib/garden/types";
import { Search } from "lucide-react";

interface PlantPickerProps {
  onSelectPlant: (plant: PlantData) => void;
}

const STRUCTURES: { type: StructureType; icon: string; label: string }[] = [
  { type: "kas", icon: "🏠", label: "Kas" },
  { type: "grondbak", icon: "📦", label: "Grondbak" },
  { type: "pad", icon: "🚶", label: "Pad" },
  { type: "schuur", icon: "🏚️", label: "Schuur" },
  { type: "hek", icon: "🪵", label: "Hek" },
];

function StructureCard({ type, icon, label }: { type: StructureType; icon: string; label: string }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("structureType", type);
      }}
      className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-accent cursor-grab active:cursor-grabbing transition-colors border border-dashed border-border hover:border-foreground/30 min-w-[60px]"
    >
      <span className="text-lg">{icon}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function PlantCard({
  plant,
  onSelect,
}: {
  plant: PlantData;
  onSelect: (plant: PlantData) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("plantId", plant.id);
      }}
      onClick={() => onSelect(plant)}
      className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent cursor-grab active:cursor-grabbing transition-colors border border-transparent hover:border-border"
    >
      <span
        className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
        style={{ backgroundColor: plant.color + "30" }}
      >
        {plant.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{plant.name}</p>
        <p className="text-xs text-muted-foreground">
          {plant.spacingCm}cm afstand
        </p>
      </div>
    </div>
  );
}

export default function PlantPicker({ onSelectPlant }: PlantPickerProps) {
  const [query, setQuery] = useState("");

  const categories: { key: PlantCategory; label: string }[] = [
    { key: "groente", label: "Groente" },
    { key: "fruit", label: "Fruit" },
    { key: "kruiden", label: "Kruiden" },
  ];

  const filtered = query.trim() ? searchPlants(query) : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Structuren */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Structuren</p>
        <div className="flex gap-2">
          {STRUCTURES.map((s) => (
            <StructureCard key={s.type} {...s} />
          ))}
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Zoekbalk */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Zoek gewas..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered ? (
        <div className="flex flex-col gap-1">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground p-2">Geen resultaten</p>
          )}
          {filtered.map((p) => (
            <PlantCard key={p.id} plant={p} onSelect={onSelectPlant} />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="groente">
          <TabsList className="w-full">
            {categories.map((c) => (
              <TabsTrigger key={c.key} value={c.key} className="flex-1">
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {categories.map((c) => (
            <TabsContent key={c.key} value={c.key} className="flex flex-col gap-1 mt-2">
              {getPlantsByCategory(c.key).map((p) => (
                <PlantCard key={p.id} plant={p} onSelect={onSelectPlant} />
              ))}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { searchPlants, getPlantsByCategory, addCustomPlant } from "@/lib/plants/catalog";
import { PlantData, PlantCategory } from "@/lib/plants/types";
import { StructureType } from "@/lib/garden/types";
import { generateId } from "@/lib/garden/helpers";
import { Search, ChevronDown, ChevronRight, Plus } from "lucide-react";

interface PlantPickerProps {
  onSelectPlant: (plant: PlantData) => void;
}

const STRUCTURES: { type: StructureType; icon: string; label: string }[] = [
  { type: "kas", icon: "🏠", label: "Kas" },
  { type: "grondbak", icon: "📦", label: "Grondbak" },
  { type: "pad", icon: "🚶", label: "Pad" },
  { type: "schuur", icon: "🏚️", label: "Schuur" },
  { type: "hek", icon: "🪵", label: "Hek" },
  { type: "boom", icon: "🌳", label: "Boom" },
];

const CATEGORY_COLORS = [
  "#e74c3c", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5",
  "#2196f3", "#009688", "#4caf50", "#8bc34a", "#ff9800",
  "#ff5722", "#795548", "#607d8b", "#f44336", "#00bcd4",
];

const CATEGORY_ICONS = [
  "🌱", "🌿", "🍃", "🌻", "🌸", "🌺", "💐", "🌹", "🌷",
  "🌾", "🍀", "🪻", "🌼", "🪴", "🌵",
];

function StructureCard({ type, icon, label }: { type: StructureType; icon: string; label: string }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("structureType", type);
      }}
      className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-accent cursor-grab active:cursor-grabbing transition-colors border border-dashed border-border hover:border-foreground/30"
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

function AddPlantForm({
  onAdd,
  onCancel,
}: {
  onAdd: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PlantCategory>("sier");
  const [spacingCm, setSpacingCm] = useState(30);
  const [rowSpacingCm, setRowSpacingCm] = useState(40);
  const [selectedIcon, setSelectedIcon] = useState("🌱");
  const [selectedColor, setSelectedColor] = useState("#4caf50");

  const handleSubmit = () => {
    if (!name.trim()) return;
    const plant: PlantData = {
      id: `custom-${generateId()}`,
      name: name.trim(),
      icon: selectedIcon,
      color: selectedColor,
      category,
      sowIndoor: null,
      sowOutdoor: null,
      harvest: { start: 1, end: 12 },
      spacingCm,
      rowSpacingCm,
      sunNeed: "vol",
      waterNeed: "gemiddeld",
      companions: { good: [], bad: [] },
    };
    addCustomPlant(plant);
    onAdd();
  };

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
      <p className="text-sm font-medium">Nieuw gewas toevoegen</p>

      <Input
        placeholder="Naam"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div>
        <p className="text-xs text-muted-foreground mb-1">Icoon</p>
        <div className="flex flex-wrap gap-1">
          {CATEGORY_ICONS.map((icon) => (
            <button
              key={icon}
              onClick={() => setSelectedIcon(icon)}
              className={`w-8 h-8 rounded flex items-center justify-center text-lg transition-colors ${
                selectedIcon === icon ? "bg-accent ring-2 ring-foreground/20" : "hover:bg-accent"
              }`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-1">Kleur</p>
        <div className="flex flex-wrap gap-1">
          {CATEGORY_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`w-6 h-6 rounded-full transition-transform ${
                selectedColor === color ? "ring-2 ring-foreground/40 scale-110" : "hover:scale-110"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-1">Categorie</p>
        <div className="flex gap-1">
          {(["groente", "fruit", "kruiden", "sier"] as PlantCategory[]).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                category === c ? "bg-foreground text-background" : "bg-accent hover:bg-accent/80"
              }`}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Plantafstand (cm)</p>
          <Input
            type="number"
            min={5}
            step={5}
            value={spacingCm}
            onChange={(e) => setSpacingCm(Number(e.target.value))}
          />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Rijafstand (cm)</p>
          <Input
            type="number"
            min={5}
            step={5}
            value={rowSpacingCm}
            onChange={(e) => setRowSpacingCm(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={!name.trim()} className="flex-1">
          Toevoegen
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Annuleer
        </Button>
      </div>
    </div>
  );
}

export default function PlantPicker({ onSelectPlant }: PlantPickerProps) {
  const [query, setQuery] = useState("");
  const [structuresOpen, setStructuresOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const categories: { key: PlantCategory; label: string }[] = [
    { key: "groente", label: "Groente" },
    { key: "fruit", label: "Fruit" },
    { key: "kruiden", label: "Kruiden" },
    { key: "sier", label: "Sier" },
  ];

  const handlePlantAdded = useCallback(() => {
    setShowAddForm(false);
    setRefreshKey((k) => k + 1);
  }, []);

  const filtered = query.trim() ? searchPlants(query) : null;

  return (
    <div className="flex flex-col gap-3" key={refreshKey}>
      {/* Structuren — inklapbaar */}
      <div>
        <button
          onClick={() => setStructuresOpen(!structuresOpen)}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          {structuresOpen ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          Structuren
        </button>
        {structuresOpen && (
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            {STRUCTURES.map((s) => (
              <StructureCard key={s.type} {...s} />
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-border" />

      {/* Zoekbalk + toevoegen */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek gewas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowAddForm(!showAddForm)}
          title="Eigen gewas toevoegen"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {showAddForm && (
        <AddPlantForm
          onAdd={handlePlantAdded}
          onCancel={() => setShowAddForm(false)}
        />
      )}

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

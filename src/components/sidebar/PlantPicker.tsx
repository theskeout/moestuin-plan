"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { searchPlants, getPlantsByCategory, addCustomPlant, updateCustomPlant, isCustomPlant } from "@/lib/plants/catalog";
import { PlantData, PlantCategory, SunNeed, WaterNeed, MonthRange } from "@/lib/plants/types";
import { StructureType } from "@/lib/garden/types";
import { generateId } from "@/lib/garden/helpers";
import { Search, ChevronDown, ChevronRight, Plus, Pencil } from "lucide-react";

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

const ICON_GROUPS: { label: string; icons: string[] }[] = [
  {
    label: "Groente",
    icons: [
      "🍅", "🥕", "🥦", "🥬", "🥒", "🌽", "🫑", "🌶️", "🧅", "🧄",
      "🥔", "🍆", "🫛", "🥜", "🫘", "🥗",
    ],
  },
  {
    label: "Fruit",
    icons: [
      "🍓", "🫐", "🍇", "🍎", "🍐", "🍑", "🍒", "🍊", "🍋", "🍌",
      "🍈", "🍉", "🥝", "🥭", "🍍",
    ],
  },
  {
    label: "Kruiden & bloemen",
    icons: [
      "🌱", "🌿", "🍃", "🍀", "🪴", "🌻", "🌸", "🌺", "🌹", "🌷",
      "🌼", "🪻", "💐", "🪷", "🌾", "🌵",
    ],
  },
];

const ALL_ICONS = ICON_GROUPS.flatMap((g) => g.icons);

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
  onEdit,
}: {
  plant: PlantData;
  onSelect: (plant: PlantData) => void;
  onEdit?: (plant: PlantData) => void;
}) {
  const custom = isCustomPlant(plant.id);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("plantId", plant.id);
      }}
      onClick={() => onSelect(plant)}
      className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent cursor-grab active:cursor-grabbing transition-colors border border-transparent hover:border-border group"
    >
      <span
        className="w-8 h-8 rounded-full flex items-center justify-center text-lg shrink-0"
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
      {custom && onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(plant);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-foreground/10 transition-opacity shrink-0"
          title="Bewerken"
        >
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

const MONTHS = ["Jan","Feb","Mrt","Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];

function MonthRangeInput({ label, value, onChange }: { label: string; value: MonthRange | null; onChange: (v: MonthRange | null) => void }) {
  const enabled = value !== null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <input type="checkbox" checked={enabled} onChange={(e) => onChange(e.target.checked ? { start: 3, end: 6 } : null)} className="rounded" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      {enabled && (
        <div className="flex gap-1">
          <select value={value!.start} onChange={(e) => onChange({ ...value!, start: Number(e.target.value) })} className="text-xs border rounded px-1 py-0.5 flex-1">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <span className="text-xs text-muted-foreground self-center">t/m</span>
          <select value={value!.end} onChange={(e) => onChange({ ...value!, end: Number(e.target.value) })} className="text-xs border rounded px-1 py-0.5 flex-1">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

function PlantForm({
  onDone,
  onCancel,
  editPlant,
}: {
  onDone: () => void;
  onCancel: () => void;
  editPlant?: PlantData;
}) {
  const [name, setName] = useState(editPlant?.name ?? "");
  const [category, setCategory] = useState<PlantCategory>(editPlant?.category ?? "sier");
  const [spacingCm, setSpacingCm] = useState(editPlant?.spacingCm ?? 30);
  const [rowSpacingCm, setRowSpacingCm] = useState(editPlant?.rowSpacingCm ?? 40);
  const [selectedIcon, setSelectedIcon] = useState(editPlant?.icon ?? "🌱");
  const [selectedColor, setSelectedColor] = useState(editPlant?.color ?? "#4caf50");
  const [showMore, setShowMore] = useState(!!editPlant?.sowIndoor || !!editPlant?.sowOutdoor || !!editPlant?.harvest);
  const [sowIndoor, setSowIndoor] = useState<MonthRange | null>(editPlant?.sowIndoor ?? null);
  const [sowOutdoor, setSowOutdoor] = useState<MonthRange | null>(editPlant?.sowOutdoor ?? null);
  const [harvest, setHarvest] = useState<MonthRange | null>(editPlant?.harvest ?? null);
  const [sunNeed, setSunNeed] = useState<SunNeed>(editPlant?.sunNeed ?? "vol");
  const [waterNeed, setWaterNeed] = useState<WaterNeed>(editPlant?.waterNeed ?? "gemiddeld");
  const [goodCompanions, setGoodCompanions] = useState(editPlant?.companions.good.join(", ") ?? "");
  const [badCompanions, setBadCompanions] = useState(editPlant?.companions.bad.join(", ") ?? "");
  const [iconsExpanded, setIconsExpanded] = useState(false);

  const isEdit = !!editPlant;

  const handleSubmit = () => {
    if (!name.trim()) return;
    const plant: PlantData = {
      id: editPlant?.id ?? `custom-${generateId()}`,
      name: name.trim(),
      icon: selectedIcon,
      color: selectedColor,
      category,
      sowIndoor,
      sowOutdoor,
      harvest: harvest || { start: 1, end: 12 },
      spacingCm,
      rowSpacingCm,
      sunNeed,
      waterNeed,
      companions: {
        good: goodCompanions.split(",").map((s) => s.trim()).filter(Boolean),
        bad: badCompanions.split(",").map((s) => s.trim()).filter(Boolean),
      },
    };
    if (isEdit) {
      updateCustomPlant(plant);
    } else {
      addCustomPlant(plant);
    }
    onDone();
  };

  // Toon standaard een compacte selectie, klik om alles te zien
  const visibleIcons = iconsExpanded ? ALL_ICONS : ALL_ICONS.slice(0, 14);

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
      <p className="text-sm font-medium">{isEdit ? "Gewas bewerken" : "Nieuw gewas toevoegen"}</p>

      <Input
        placeholder="Naam"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div>
        <p className="text-xs text-muted-foreground mb-1">Icoon</p>
        <div className="flex flex-wrap gap-1">
          {visibleIcons.map((icon, i) => (
            <button
              key={`${icon}-${i}`}
              onClick={() => setSelectedIcon(icon)}
              className={`w-7 h-7 rounded flex items-center justify-center text-base transition-colors ${
                selectedIcon === icon ? "bg-accent ring-2 ring-foreground/20" : "hover:bg-accent"
              }`}
            >
              {icon}
            </button>
          ))}
          {!iconsExpanded && (
            <button
              onClick={() => setIconsExpanded(true)}
              className="w-7 h-7 rounded flex items-center justify-center text-xs text-muted-foreground hover:bg-accent transition-colors"
              title="Meer iconen"
            >
              +{ALL_ICONS.length - 14}
            </button>
          )}
        </div>
        {iconsExpanded && (
          <button
            onClick={() => setIconsExpanded(false)}
            className="text-xs text-muted-foreground hover:text-foreground mt-1"
          >
            Minder tonen
          </button>
        )}
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
          <Input type="number" min={5} step={5} value={spacingCm} onChange={(e) => setSpacingCm(Number(e.target.value))} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Rijafstand (cm)</p>
          <Input type="number" min={5} step={5} value={rowSpacingCm} onChange={(e) => setRowSpacingCm(Number(e.target.value))} />
        </div>
      </div>

      <button
        onClick={() => setShowMore(!showMore)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {showMore ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        Meer opties (zaaitijd, zon, buren)
      </button>

      {showMore && (
        <div className="space-y-3 pt-1">
          <MonthRangeInput label="Binnen zaaien" value={sowIndoor} onChange={setSowIndoor} />
          <MonthRangeInput label="Buiten zaaien" value={sowOutdoor} onChange={setSowOutdoor} />
          <MonthRangeInput label="Oogst" value={harvest} onChange={setHarvest} />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Zon</p>
              <select value={sunNeed} onChange={(e) => setSunNeed(e.target.value as SunNeed)} className="w-full text-xs border rounded px-2 py-1.5">
                <option value="vol">Volle zon</option>
                <option value="halfschaduw">Halfschaduw</option>
                <option value="schaduw">Schaduw</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Water</p>
              <select value={waterNeed} onChange={(e) => setWaterNeed(e.target.value as WaterNeed)} className="w-full text-xs border rounded px-2 py-1.5">
                <option value="laag">Weinig</option>
                <option value="gemiddeld">Gemiddeld</option>
                <option value="hoog">Veel</option>
              </select>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Goede buren (komma-gescheiden)</p>
            <Input placeholder="bijv. tomaat, wortel" value={goodCompanions} onChange={(e) => setGoodCompanions(e.target.value)} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Slechte buren (komma-gescheiden)</p>
            <Input placeholder="bijv. aardappel, venkel" value={badCompanions} onChange={(e) => setBadCompanions(e.target.value)} />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={!name.trim()} className="flex-1">
          {isEdit ? "Opslaan" : "Toevoegen"}
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
  const [editingPlant, setEditingPlant] = useState<PlantData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const categories: { key: PlantCategory; label: string }[] = [
    { key: "groente", label: "Groente" },
    { key: "fruit", label: "Fruit" },
    { key: "kruiden", label: "Kruiden" },
    { key: "sier", label: "Sier" },
  ];

  const handleFormDone = useCallback(() => {
    setShowAddForm(false);
    setEditingPlant(null);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleEdit = useCallback((plant: PlantData) => {
    setEditingPlant(plant);
    setShowAddForm(false);
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
          onClick={() => { setShowAddForm(!showAddForm); setEditingPlant(null); }}
          title="Eigen gewas toevoegen"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Formulier voor toevoegen of bewerken */}
      {(showAddForm || editingPlant) && (
        <PlantForm
          onDone={handleFormDone}
          onCancel={() => { setShowAddForm(false); setEditingPlant(null); }}
          editPlant={editingPlant ?? undefined}
        />
      )}

      {filtered ? (
        <div className="flex flex-col gap-1">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground p-2">Geen resultaten</p>
          )}
          {filtered.map((p) => (
            <PlantCard key={p.id} plant={p} onSelect={onSelectPlant} onEdit={handleEdit} />
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
                <PlantCard key={p.id} plant={p} onSelect={onSelectPlant} onEdit={handleEdit} />
              ))}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

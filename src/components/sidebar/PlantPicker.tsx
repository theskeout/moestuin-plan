"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { searchPlants, getPlantsByCategory, addCustomPlant, updateCustomPlant, isBuiltinPlant, savePlantOverride, removeCustomPlant } from "@/lib/plants/catalog";
import { isLoggedIn } from "@/lib/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PlantData, PlantCategory, SunNeed, WaterNeed, MonthRange } from "@/lib/plants/types";
import { StructureType } from "@/lib/garden/types";
import { generateId } from "@/lib/garden/helpers";
import { Search, ChevronDown, ChevronRight, Plus, Pencil } from "lucide-react";

interface PlantPickerProps {
  onSelectPlant: (plant: PlantData) => void;
  onTapStructure?: (type: StructureType, customLabel?: string, customIcon?: string) => void;
}

const STRUCTURES: { type: StructureType; icon: string; label: string }[] = [
  { type: "kas", icon: "\u{1F3E0}", label: "Kas" },
  { type: "grondbak", icon: "\u{1F4E6}", label: "Grondbak" },
  { type: "pad", icon: "\u{1F6B6}", label: "Pad" },
  { type: "schuur", icon: "\u{1F3DA}\u{FE0F}", label: "Schuur" },
  { type: "hek", icon: "\u{1FAB5}", label: "Hek" },
  { type: "boom", icon: "\u{1F333}", label: "Boom" },
  { type: "compostbak", icon: "\u{267B}\u{FE0F}", label: "Compostbak" },
  { type: "gras", icon: "\u{1F331}", label: "Gras" },
  { type: "waterton", icon: "\u{1F4A7}", label: "Waterton" },
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
      "\u{1F345}", "\u{1F955}", "\u{1F966}", "\u{1F96C}", "\u{1F952}", "\u{1F33D}", "\u{1FAD1}", "\u{1F336}\u{FE0F}", "\u{1F9C5}", "\u{1F9C4}",
      "\u{1F954}", "\u{1F346}", "\u{1FAD4}", "\u{1F95C}", "\u{1FAD8}", "\u{1F957}",
    ],
  },
  {
    label: "Fruit",
    icons: [
      "\u{1F353}", "\u{1FAD0}", "\u{1F347}", "\u{1F34E}", "\u{1F350}", "\u{1F351}", "\u{1F352}", "\u{1F34A}", "\u{1F34B}", "\u{1F34C}",
      "\u{1F348}", "\u{1F349}", "\u{1F95D}", "\u{1F96D}", "\u{1F34D}",
    ],
  },
  {
    label: "Kruiden & bloemen",
    icons: [
      "\u{1F331}", "\u{1F33F}", "\u{1F343}", "\u{1F340}", "\u{1FAB4}", "\u{1F33B}", "\u{1F338}", "\u{1F33A}", "\u{1F339}", "\u{1F337}",
      "\u{1F33C}", "\u{1FAB7}", "\u{1F490}", "\u{1FAB7}", "\u{1F33E}", "\u{1F335}",
    ],
  },
];

const ALL_ICONS = ICON_GROUPS.flatMap((g) => g.icons);

const STRUCTURE_ICONS = [
  "🏠", "📦", "🚶", "🏚️", "🪵", "🌳", "♻️",
  "🪴", "🧱", "⛲", "🪨", "🏗️", "🛖", "🪣",
  "🚿", "💧", "🪑", "🏕️", "🌿", "🔧", "📌",
];

const isTouchDevice = () => typeof window !== "undefined" && "ontouchstart" in window;

function StructureCard({ type, icon, label, onTap }: { type: StructureType; icon: string; label: string; onTap?: (type: StructureType) => void }) {
  const touch = isTouchDevice();
  return (
    <div
      draggable={!touch}
      onDragStart={(e) => {
        e.dataTransfer.setData("structureType", type);
      }}
      onClick={() => onTap?.(type)}
      className={`flex flex-col items-center justify-center p-2 rounded-lg hover:bg-accent transition-colors border border-dashed border-border hover:border-foreground/30 ${touch ? "cursor-pointer active:bg-accent" : "cursor-grab active:cursor-grabbing"}`}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function CustomStructureForm({ onDone, onCancel }: { onDone: (label: string, icon: string) => void; onCancel: () => void }) {
  const [label, setLabel] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("📌");

  return (
    <div className="space-y-3 p-2 border rounded-lg bg-accent/30">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Eigen structuur</p>
      <Input
        placeholder="Naam (bijv. Regenton)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="h-8 text-sm"
      />
      <div>
        <p className="text-xs text-muted-foreground mb-1">Pictogram</p>
        <div className="flex flex-wrap gap-1">
          {STRUCTURE_ICONS.map((icon, i) => (
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
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => { if (label.trim()) onDone(label.trim(), selectedIcon); }} disabled={!label.trim()} className="flex-1">
          Toevoegen
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Annuleer
        </Button>
      </div>
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
  const touch = isTouchDevice();
  return (
    <div
      draggable={!touch}
      onDragStart={(e) => {
        e.dataTransfer.setData("plantId", plant.id);
      }}
      onClick={() => onSelect(plant)}
      className={`flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors border border-transparent hover:border-border group ${touch ? "cursor-pointer active:bg-accent" : "cursor-grab active:cursor-grabbing"}`}
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
      {onEdit && (
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
  onDelete,
  editPlant,
}: {
  onDone: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  editPlant?: PlantData;
}) {
  const [name, setName] = useState(editPlant?.name ?? "");
  const [category, setCategory] = useState<PlantCategory>(editPlant?.category ?? "sier");
  const [spacingCm, setSpacingCm] = useState(editPlant?.spacingCm ?? 30);
  const [rowSpacingCm, setRowSpacingCm] = useState(editPlant?.rowSpacingCm ?? 40);
  const [selectedIcon, setSelectedIcon] = useState(editPlant?.icon ?? "\u{1F331}");
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
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const isEdit = !!editPlant;

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const plant: PlantData = {
      id: editPlant?.id ?? `custom-${generateId()}`,
      name: name.trim(),
      icon: selectedIcon,
      color: selectedColor,
      category,
      sowIndoor,
      sowOutdoor,
      harvest,
      spacingCm,
      rowSpacingCm,
      sunNeed,
      waterNeed,
      companions: {
        good: goodCompanions.split(",").map((s) => s.trim()).filter(Boolean),
        bad: badCompanions.split(",").map((s) => s.trim()).filter(Boolean),
      },
    };
    if (isEdit && isBuiltinPlant(plant.id)) {
      await savePlantOverride(plant);
    } else if (isEdit) {
      await updateCustomPlant(plant);
    } else {
      await addCustomPlant(plant);
    }
    onDone();
  };

  // Toon standaard een compacte selectie, klik om alles te zien
  const visibleIcons = iconsExpanded ? ALL_ICONS : ALL_ICONS.slice(0, 14);

  return (
    <div className="space-y-3">
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

      {isEdit && editPlant && !isBuiltinPlant(editPlant.id) && (
        <div className="pt-2 border-t">
          {deleteConfirm ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={async () => {
                  await removeCustomPlant(editPlant.id);
                  onDelete?.();
                }}
              >
                Zeker weten?
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(false)}>
                Annuleer
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => setDeleteConfirm(true)}
            >
              Gewas verwijderen
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function PlantPicker({ onSelectPlant, onTapStructure }: PlantPickerProps) {
  const [query, setQuery] = useState("");
  const [structuresOpen, setStructuresOpen] = useState(false);
  const [gewassenOpen, setGewassenOpen] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCustomStructureForm, setShowCustomStructureForm] = useState(false);
  const [editingPlant, setEditingPlant] = useState<PlantData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loggedIn = isLoggedIn();

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
          className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors w-full py-1"
        >
          {structuresOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Structuren
          <span className="text-xs font-normal text-muted-foreground ml-auto">sleep naar canvas</span>
        </button>
        {structuresOpen && (
          <div className="space-y-2 mt-1.5">
            <div className="grid grid-cols-3 gap-2">
              {STRUCTURES.map((s) => (
                <StructureCard key={s.type} {...s} onTap={onTapStructure} />
              ))}
              <button
                onClick={() => setShowCustomStructureForm(!showCustomStructureForm)}
                className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-accent transition-colors border border-dashed border-border hover:border-foreground/30 cursor-pointer"
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Eigen</span>
              </button>
            </div>
            {showCustomStructureForm && (
              <CustomStructureForm
                onDone={(label, icon) => {
                  onTapStructure?.("custom" as StructureType, label, icon);
                  setShowCustomStructureForm(false);
                }}
                onCancel={() => setShowCustomStructureForm(false)}
              />
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-border" />

      {/* Gewassen — standaard open */}
      <div>
        <button
          onClick={() => setGewassenOpen(!gewassenOpen)}
          className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors w-full py-1"
        >
          {gewassenOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Gewassen
          <span className="text-xs font-normal text-muted-foreground ml-auto">sleep naar canvas</span>
        </button>
      </div>

      {gewassenOpen && (
        <>
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
            {loggedIn && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => { setShowAddForm(!showAddForm); setEditingPlant(null); }}
                title="Eigen gewas toevoegen"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>

          {filtered ? (
            <div className="flex flex-col gap-1">
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground p-2">Geen resultaten</p>
              )}
              {filtered.map((p) => (
                <PlantCard key={p.id} plant={p} onSelect={onSelectPlant} onEdit={loggedIn ? handleEdit : undefined} />
              ))}
            </div>
          ) : (
            <Tabs defaultValue="groente">
              <div className="sticky top-0 z-10 bg-background pb-1">
                <TabsList className="w-full">
                  {categories.map((c) => (
                    <TabsTrigger key={c.key} value={c.key} className="flex-1 text-xs px-2">
                      {c.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {categories.map((c) => (
                <TabsContent key={c.key} value={c.key} className="flex flex-col gap-1 mt-1">
                  {getPlantsByCategory(c.key).map((p) => (
                    <PlantCard key={p.id} plant={p} onSelect={onSelectPlant} onEdit={loggedIn ? handleEdit : undefined} />
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </>
      )}

      {/* Formulier voor toevoegen of bewerken (modal) */}
      <Dialog open={showAddForm || !!editingPlant} onOpenChange={(open) => { if (!open) { setShowAddForm(false); setEditingPlant(null); } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlant ? "Gewas bewerken" : "Nieuw gewas toevoegen"}</DialogTitle>
            <DialogDescription>
              {editingPlant ? "Pas de eigenschappen van dit gewas aan." : "Voeg een eigen gewas toe aan je collectie."}
            </DialogDescription>
          </DialogHeader>
          <PlantForm
            onDone={handleFormDone}
            onCancel={() => { setShowAddForm(false); setEditingPlant(null); }}
            onDelete={() => { setEditingPlant(null); setRefreshKey((k) => k + 1); }}
            editPlant={editingPlant ?? undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

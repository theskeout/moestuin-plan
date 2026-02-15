"use client";

import { useState, useMemo, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PlantPicker from "@/components/sidebar/PlantPicker";
import PlantInfo from "@/components/sidebar/PlantInfo";
import CompanionAlert from "@/components/sidebar/CompanionAlert";
import CanvasToolbar from "@/components/canvas/CanvasToolbar";
import UserMenu from "@/components/auth/UserMenu";
import { useGarden } from "@/lib/hooks/useGarden";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { useAuth } from "@/components/auth/AuthProvider";
import { loadGardensAsync, exportGarden, importGarden } from "@/lib/garden/storage";
import { getPlant, refreshPlantCache } from "@/lib/plants/catalog";
import { setStorageBackend } from "@/lib/storage";
import { checkAllCompanions, CompanionCheck } from "@/lib/plants/companions";
import { findNearbyZones, calculatePlantPositions } from "@/lib/garden/helpers";
import { PlantData } from "@/lib/plants/types";
import { createRectangleCorners, generateId } from "@/lib/garden/helpers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Move, Lock, Unlock, Check, Download, Upload, Pencil, Search, X, Plus, ZoomIn, ZoomOut, Grid3X3, Trash2 } from "lucide-react";

const GardenCanvas = dynamic(
  () => import("@/components/canvas/GardenCanvas"),
  { ssr: false }
);

const STRUCTURE_LABELS: Record<string, string> = {
  kas: "Kas", grondbak: "Grondbak", pad: "Pad", schuur: "Schuur", hek: "Hek", boom: "Boom",
};

/* ---------- Mobiel: Bottom Sheet met swipe gestures ---------- */
function MobileBottomSheet({
  open,
  onClose,
  title,
  children,
  height = "60vh",
  expandable,
  expanded,
  onExpandChange,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: string;
  expandable?: boolean;
  expanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startHeight: number; dragging: boolean }>({
    startY: 0, startHeight: 0, dragging: false,
  });
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Reset drag state als open/expanded wijzigt
  useEffect(() => {
    setDragOffset(0);
    setIsDragging(false);
  }, [open, expanded]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    // Alleen starten op de handle area (bovenste ~40px)
    const touch = e.touches[0];
    const rect = sheet.getBoundingClientRect();
    if (touch.clientY - rect.top > 44) return;
    dragRef.current = {
      startY: touch.clientY,
      startHeight: sheet.offsetHeight,
      dragging: true,
    };
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragRef.current.dragging) return;
    const dy = e.touches[0].clientY - dragRef.current.startY;
    setDragOffset(dy);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    setIsDragging(false);
    const dy = dragOffset;
    setDragOffset(0);

    const threshold = 60;

    if (dy > threshold) {
      // Naar beneden gesleept
      if (expandable && expanded) {
        // Expanded → compact
        onExpandChange?.(false);
      } else {
        // Compact → sluiten
        onClose();
      }
    } else if (dy < -threshold) {
      // Naar boven gesleept
      if (expandable && !expanded) {
        // Compact → expanded
        onExpandChange?.(true);
      }
    }
  }, [dragOffset, expandable, expanded, onExpandChange, onClose]);

  if (!open) return null;

  const expandedHeight = "85vh";
  const currentHeight = expanded ? expandedHeight : height;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={sheetRef}
        className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl flex flex-col ${!isDragging ? "transition-all duration-200" : ""}`}
        style={{
          maxHeight: currentHeight,
          transform: isDragging && dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1 cursor-grab shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-gray-300" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-4 pb-2 shrink-0">
            <h3 className="font-semibold text-sm">{title}</h3>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-accent">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
}

function TuinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [editingCorners, setEditingCorners] = useState(false);
  const [sidebarPlant, setSidebarPlant] = useState<PlantData | null>(null);
  const [saveLabel, setSaveLabel] = useState("Opslaan");
  const [zoom, setZoom] = useState(1);
  const [gridVisible, setGridVisible] = useState(true);
  const [editingHeader, setEditingHeader] = useState(false);
  const [editName, setEditName] = useState("");
  const [editWidth, setEditWidth] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const [gardenLoading, setGardenLoading] = useState(true);
  const [canvasSearch, setCanvasSearch] = useState("");
  const [mobileAddOpen, setMobileAddOpen] = useState(false);
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);
  const [mobileInfoExpanded, setMobileInfoExpanded] = useState(false);
  const initRef = useRef(false);
  const newGardenIdRef = useRef(generateId());

  const {
    garden, selectedId, selectedType, select, hasChanges,
    addZone, moveZone, transformZone, removeZone, toggleZoneLock, updateZoneInfo,
    addStructure, moveStructure, transformStructure, removeStructure, toggleStructureLock,
    updateShape, updateGardenSize, save, loadGarden,
  } = useGarden();

  // Async garden loading via storage backend (draait eenmalig na auth)
  useEffect(() => {
    if (authLoading || initRef.current) return;
    initRef.current = true;

    async function init() {
      if (user) {
        setStorageBackend("supabase", user.id);
      } else {
        setStorageBackend("local");
      }
      await refreshPlantCache();

      const id = searchParams.get("id");
      if (id) {
        const gardens = await loadGardensAsync();
        const found = gardens.find((g) => g.id === id);
        if (found) {
          loadGarden(found);
        }
      } else {
        const name = searchParams.get("name") || "Mijn Moestuin";
        const w = Number(searchParams.get("w")) || 300;
        const h = Number(searchParams.get("h")) || 1000;
        loadGarden({
          id: newGardenIdRef.current, name, widthCm: w, heightCm: h,
          shape: { corners: createRectangleCorners(w, h) },
          plants: [], zones: [], structures: [],
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        });
      }
      setGardenLoading(false);
    }

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  const handleSave = useCallback(async () => {
    await save();
    setSaveLabel("Opgeslagen!");
    setTimeout(() => setSaveLabel("Opslaan"), 2000);
  }, [save]);

  useAutoSave(hasChanges, handleSave);

  const handleExport = useCallback(() => {
    const json = exportGarden(garden);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${garden.name.replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [garden]);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result !== "string") return;
        const imported = importGarden(result);
        if (imported) {
          loadGarden(imported);
        } else {
          alert("Ongeldig bestand.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [loadGarden]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z * 1.2, 15));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z / 1.2, 0.1));
  }, []);

  const companionChecks = useMemo((): CompanionCheck[] => {
    if (!selectedId || selectedType !== "zone") return [];
    const zone = garden.zones.find((z) => z.id === selectedId);
    if (!zone) return [];
    const nearby = findNearbyZones(zone, garden.zones, 50);
    return checkAllCompanions(zone.plantId, nearby.map((n) => n.plantId));
  }, [selectedId, selectedType, garden.zones]);

  const selectedZoneData = useMemo(() => {
    if (!selectedId || selectedType !== "zone") return null;
    const zone = garden.zones.find((z) => z.id === selectedId);
    if (!zone) return null;
    const plantData = getPlant(zone.plantId);
    if (!plantData) return null;
    const positions = calculatePlantPositions(zone, plantData);
    return { zone, plantData, plantCount: positions.length };
  }, [selectedId, selectedType, garden.zones]);

  const canvasSearchResults = useMemo(() => {
    const q = canvasSearch.trim().toLowerCase();
    if (!q) return [];
    return garden.zones
      .map((zone) => ({ zone, plant: getPlant(zone.plantId) }))
      .filter(({ plant }) => plant?.name.toLowerCase().includes(q));
  }, [canvasSearch, garden.zones]);

  const selectedStruct = useMemo(() => {
    if (!selectedId || selectedType !== "structure") return null;
    return garden.structures.find((s) => s.id === selectedId) || null;
  }, [selectedId, selectedType, garden.structures]);

  // Mobiel: open info-sheet automatisch bij selectie
  useEffect(() => {
    if (selectedId && (selectedZoneData || selectedStruct)) {
      setMobileInfoOpen(true);
      setMobileInfoExpanded(false);
    } else {
      setMobileInfoOpen(false);
      setMobileInfoExpanded(false);
    }
  }, [selectedId, selectedZoneData, selectedStruct]);

  if (gardenLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Tuin laden...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-2 md:px-4 py-2 border-b bg-white">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {editingHeader ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 w-36 text-sm font-semibold"
                placeholder="Naam"
              />
              <Input
                type="number" min={50} step={10}
                value={editWidth}
                onChange={(e) => setEditWidth(e.target.value)}
                className="h-8 w-20 text-sm"
              />
              <span className="text-sm text-muted-foreground">x</span>
              <Input
                type="number" min={50} step={10}
                value={editHeight}
                onChange={(e) => setEditHeight(e.target.value)}
                className="h-8 w-20 text-sm"
              />
              <span className="text-sm text-muted-foreground">cm</span>
              <Button size="sm" variant="secondary" onClick={() => {
                const w = Math.max(50, Number(editWidth) || garden.widthCm);
                const h = Math.max(50, Number(editHeight) || garden.heightCm);
                const n = editName.trim() || garden.name;
                updateGardenSize(n, w, h);
                setEditingHeader(false);
              }}>
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <>
              <h1 className="font-semibold text-sm md:text-base truncate">{garden.name}</h1>
              <span className="text-xs md:text-sm text-muted-foreground whitespace-nowrap hidden sm:inline">
                {garden.widthCm} x {garden.heightCm}cm
              </span>
              <button
                onClick={() => {
                  setEditName(garden.name);
                  setEditWidth(String(garden.widthCm));
                  setEditHeight(String(garden.heightCm));
                  setEditingHeader(true);
                }}
                className="p-1 rounded hover:bg-accent transition-colors shrink-0"
                title="Naam en formaat aanpassen"
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <UserMenu />
          <div className="w-px h-6 bg-border hidden md:block" />
          <Button
            variant={editingCorners ? "secondary" : "outline"}
            size="sm"
            onClick={() => setEditingCorners(!editingCorners)}
            className="hidden md:inline-flex"
          >
            <Move className="h-3.5 w-3.5 mr-1.5" />
            {editingCorners ? "Klaar" : "Hoeken aanpassen"}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleExport} title="Exporteer JSON" className="hidden md:inline-flex">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleImport} title="Importeer JSON" className="hidden md:inline-flex">
            <Upload className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border hidden md:block" />
          {hasChanges && (
            <span className="text-xs text-muted-foreground hidden md:inline">Niet opgeslagen</span>
          )}
          <Button size="sm" onClick={handleSave} variant={saveLabel === "Opgeslagen!" ? "secondary" : "default"}>
            {saveLabel === "Opgeslagen!" && <Check className="h-3.5 w-3.5 mr-1" />}
            <span className="hidden sm:inline">{saveLabel}</span>
            <span className="sm:hidden"><Check className="h-3.5 w-3.5" /></span>
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Linkerpaneel: toolbar + geselecteerd element */}
        <aside className="w-72 border-r bg-white overflow-y-auto hidden md:flex md:flex-col">
          {/* Toolbar altijd zichtbaar */}
          <div className="p-3 border-b">
            <CanvasToolbar
              zoom={zoom}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onZoomSet={setZoom}
              gridVisible={gridVisible}
              onToggleGrid={() => setGridVisible(!gridVisible)}
            />
          </div>

          {/* Zoek gewas op canvas */}
          <div className="px-3 pt-3 pb-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Zoek gewas op canvas..."
                value={canvasSearch}
                onChange={(e) => setCanvasSearch(e.target.value)}
                className="h-8 pl-8 pr-8 text-sm"
              />
              {canvasSearch && (
                <button
                  onClick={() => setCanvasSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-accent transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Zoekresultaten */}
            {canvasSearch.trim() ? (
              canvasSearchResults.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {canvasSearchResults.length} resultaat{canvasSearchResults.length !== 1 ? "en" : ""}
                  </p>
                  {canvasSearchResults.map(({ zone, plant }) => (
                    <button
                      key={zone.id}
                      onClick={() => {
                        select(zone.id, "zone");
                        setCanvasSearch("");
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm hover:bg-accent transition-colors"
                    >
                      <span className="text-base">{plant?.icon}</span>
                      <span className="flex-1 truncate">{plant?.name}{zone.label ? ` — ${zone.label}` : ""}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {zone.widthCm}x{zone.heightCm}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Geen resultaten</p>
              )
            ) : (
            <>
            {/* Zone geselecteerd */}
            {selectedZoneData && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <span className="text-xl">{selectedZoneData.plantData.icon}</span>
                    {selectedZoneData.plantData.name}
                  </h3>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => { if (selectedId) toggleZoneLock(selectedId); }}
                      title={selectedZoneData.zone.locked ? "Ontgrendel" : "Vergrendel"}
                    >
                      {selectedZoneData.zone.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bed</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Breedte (cm)</p>
                      <Input
                        type="number" min={10} step={10}
                        value={selectedZoneData.zone.widthCm}
                        onChange={(e) => {
                          if (!selectedId) return;
                          const val = Math.max(10, Number(e.target.value));
                          transformZone(selectedId, selectedZoneData.zone.x, selectedZoneData.zone.y, val, selectedZoneData.zone.heightCm, selectedZoneData.zone.rotation);
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Hoogte (cm)</p>
                      <Input
                        type="number" min={10} step={10}
                        value={selectedZoneData.zone.heightCm}
                        onChange={(e) => {
                          if (!selectedId) return;
                          const val = Math.max(10, Number(e.target.value));
                          transformZone(selectedId, selectedZoneData.zone.x, selectedZoneData.zone.y, selectedZoneData.zone.widthCm, val, selectedZoneData.zone.rotation);
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Rotatie (graden)</p>
                    <Input
                      type="number" step={1}
                      value={Math.round(selectedZoneData.zone.rotation)}
                      onChange={(e) => {
                        if (!selectedId) return;
                        const val = Number(e.target.value);
                        transformZone(selectedId, selectedZoneData.zone.x, selectedZoneData.zone.y, selectedZoneData.zone.widthCm, selectedZoneData.zone.heightCm, val);
                      }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedZoneData.plantCount} planten
                    {selectedZoneData.zone.locked && " — Vergrendeld"}
                  </p>
                </div>

                {/* Verfijning en opmerkingen */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notities</p>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Verfijning (soort)</p>
                    <Input
                      placeholder={`Type ${selectedZoneData.plantData.name.toLowerCase()}`}
                      value={selectedZoneData.zone.label || ""}
                      onChange={(e) => {
                        if (!selectedId) return;
                        updateZoneInfo(selectedId, e.target.value, selectedZoneData.zone.notes || "");
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Opmerkingen</p>
                    <textarea
                      placeholder="bijv. Stekje van de buren, test nieuwe soort..."
                      value={selectedZoneData.zone.notes || ""}
                      onChange={(e) => {
                        if (!selectedId) return;
                        updateZoneInfo(selectedId, selectedZoneData.zone.label || "", e.target.value);
                      }}
                      className="w-full text-sm border rounded-md px-3 py-2 min-h-[60px] resize-y bg-background"
                    />
                  </div>
                </div>

                <div className="h-px bg-border" />

                <PlantInfo plant={selectedZoneData.plantData} onClose={() => {}} compact />

                <div className="h-px bg-border" />

                <CompanionAlert checks={companionChecks} />

                <Button
                  variant="ghost" size="sm"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => { if (selectedId) removeZone(selectedId); }}
                >
                  Bed verwijderen
                </Button>
              </>
            )}

            {/* Structuur geselecteerd */}
            {selectedStruct && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">
                    {STRUCTURE_LABELS[selectedStruct.type] || selectedStruct.type}
                  </h3>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => { if (selectedId) toggleStructureLock(selectedId); }}
                      title={selectedStruct.locked ? "Ontgrendel" : "Vergrendel"}
                    >
                      {selectedStruct.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Afmetingen</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Breedte (cm)</p>
                      <Input
                        type="number" min={10} step={10}
                        value={selectedStruct.widthCm}
                        onChange={(e) => {
                          if (!selectedId) return;
                          const val = Math.max(10, Number(e.target.value));
                          transformStructure(selectedId, selectedStruct.x, selectedStruct.y, val, selectedStruct.heightCm, selectedStruct.rotation);
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Hoogte (cm)</p>
                      <Input
                        type="number" min={10} step={10}
                        value={selectedStruct.heightCm}
                        onChange={(e) => {
                          if (!selectedId) return;
                          const val = Math.max(10, Number(e.target.value));
                          transformStructure(selectedId, selectedStruct.x, selectedStruct.y, selectedStruct.widthCm, val, selectedStruct.rotation);
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Rotatie (graden)</p>
                    <Input
                      type="number" step={1}
                      value={Math.round(selectedStruct.rotation)}
                      onChange={(e) => {
                        if (!selectedId) return;
                        const val = Number(e.target.value);
                        transformStructure(selectedId, selectedStruct.x, selectedStruct.y, selectedStruct.widthCm, selectedStruct.heightCm, val);
                      }}
                    />
                  </div>
                  {selectedStruct.locked && (
                    <p className="text-sm text-muted-foreground">Vergrendeld</p>
                  )}
                </div>

                <Button
                  variant="ghost" size="sm"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => { if (selectedId) removeStructure(selectedId); }}
                >
                  Structuur verwijderen
                </Button>
              </>
            )}

            {/* Niets geselecteerd */}
            {!selectedZoneData && !selectedStruct && (
              <p className="text-sm text-muted-foreground">
                Klik op een gewas of structuur om details te zien en aan te passen.
              </p>
            )}
            </>
            )}
          </div>
        </aside>

        {/* Canvas */}
        <GardenCanvas
          garden={garden}
          selectedId={selectedId}
          selectedType={selectedType}
          onSelect={select}
          onMoveZone={moveZone}
          onTransformZone={transformZone}
          onAddZone={addZone}
          onRemoveZone={removeZone}
          onMoveStructure={moveStructure}
          onTransformStructure={transformStructure}
          onAddStructure={addStructure}
          onRemoveStructure={removeStructure}
          onUpdateShape={updateShape}
          editingCorners={editingCorners}
          zoom={zoom}
          onZoomChange={setZoom}
          gridVisible={gridVisible}
        />

        {/* Rechterpaneel: tabs */}
        <aside className="w-72 border-l bg-white hidden md:flex md:flex-col">
          <Tabs defaultValue="toevoegen" className="flex flex-col flex-1 overflow-hidden">
            <div className="p-3 pb-0">
              <TabsList className="w-full">
                <TabsTrigger value="toevoegen" className="flex-1">Toevoegen</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="toevoegen" className="flex flex-col flex-1 overflow-hidden mt-0">
              <div className="flex-1 overflow-y-auto p-4 pt-3 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Sleep naar het canvas
                </p>
                <PlantPicker onSelectPlant={(plant) => setSidebarPlant(plant)} />
              </div>
              {sidebarPlant && (
                <div className="border-t bg-white p-3 max-h-[40%] overflow-y-auto">
                  <PlantInfo plant={sidebarPlant} onClose={() => setSidebarPlant(null)} />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </aside>

        {/* --- Mobiel: floating controls (alleen <md) --- */}

        {/* Floating toolbar linksonder: zoom + grid */}
        <div className="fixed bottom-4 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border px-1 py-1 z-40 md:hidden">
          <button onClick={handleZoomOut} className="p-2 rounded-full hover:bg-accent">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground min-w-[2.5rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={handleZoomIn} className="p-2 rounded-full hover:bg-accent">
            <ZoomIn className="h-4 w-4" />
          </button>
          <div className="w-px h-5 bg-border" />
          <button onClick={() => setGridVisible(!gridVisible)} className={`p-2 rounded-full ${gridVisible ? "bg-accent" : "hover:bg-accent"}`}>
            <Grid3X3 className="h-4 w-4" />
          </button>
        </div>

        {/* Floating plus-knop rechtsboven canvas om elementen toe te voegen */}
        <button
          onClick={() => setMobileAddOpen(true)}
          className="fixed top-16 right-3 z-40 md:hidden w-11 h-11 bg-foreground text-background rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          title="Gewas of structuur toevoegen"
        >
          <Plus className="h-5 w-5" />
        </button>

        {/* Mobiel: bottom sheet voor toevoegen */}
        <MobileBottomSheet
          open={mobileAddOpen}
          onClose={() => { setMobileAddOpen(false); setSidebarPlant(null); }}
          title="Toevoegen"
          height="70vh"
        >
          {sidebarPlant ? (
            <div className="space-y-3">
              <PlantInfo plant={sidebarPlant} onClose={() => setSidebarPlant(null)} />
              <Button
                className="w-full"
                onClick={() => {
                  addZone(sidebarPlant.id, garden.widthCm / 2, garden.heightCm / 2);
                  setSidebarPlant(null);
                  setMobileAddOpen(false);
                }}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Plaats op canvas
              </Button>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                Tik op een gewas om te bekijken en te plaatsen.
              </p>
              <PlantPicker
                onSelectPlant={(plant) => setSidebarPlant(plant)}
                onTapStructure={(type) => {
                  addStructure(type, garden.widthCm / 2, garden.heightCm / 2);
                  setMobileAddOpen(false);
                }}
              />
            </>
          )}
        </MobileBottomSheet>

        {/* Mobiel: bottom sheet voor geselecteerd element info */}
        <MobileBottomSheet
          open={mobileInfoOpen && !mobileAddOpen && (!!selectedZoneData || !!selectedStruct)}
          onClose={() => { setMobileInfoOpen(false); setMobileInfoExpanded(false); select(null); }}
          height="50vh"
          expandable
          expanded={mobileInfoExpanded}
          onExpandChange={setMobileInfoExpanded}
        >
          {/* Zone geselecteerd */}
          {selectedZoneData && (
            <div className="space-y-3">
              {/* Header: altijd zichtbaar */}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <span className="text-xl">{selectedZoneData.plantData.icon}</span>
                  {selectedZoneData.plantData.name}
                  {selectedZoneData.zone.label && (
                    <span className="text-sm font-normal text-muted-foreground">— {selectedZoneData.zone.label}</span>
                  )}
                </h3>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => { if (selectedId) toggleZoneLock(selectedId); }}
                  >
                    {selectedZoneData.zone.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => { if (selectedId) { removeZone(selectedId); setMobileInfoOpen(false); } }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Compacte stats: altijd zichtbaar */}
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="block font-medium text-foreground">{selectedZoneData.zone.widthCm} x {selectedZoneData.zone.heightCm}cm</span>
                  Bed
                </div>
                <div>
                  <span className="block font-medium text-foreground">{selectedZoneData.plantCount}</span>
                  Planten
                </div>
                <div>
                  <span className="block font-medium text-foreground">{Math.round(selectedZoneData.zone.rotation)}°</span>
                  Rotatie
                </div>
              </div>

              {!mobileInfoExpanded && (
                <>
                  {selectedZoneData.zone.notes && (
                    <p className="text-xs text-muted-foreground italic">{selectedZoneData.zone.notes}</p>
                  )}
                  {companionChecks.length > 0 && <CompanionAlert checks={companionChecks} />}
                  {/* Swipe hint */}
                  <p className="text-[11px] text-center text-muted-foreground/60">
                    Sleep omhoog voor details en bewerken
                  </p>
                </>
              )}

              {/* Uitgebreide view: zichtbaar na omhoog slepen */}
              {mobileInfoExpanded && (
                <div className="space-y-4">
                  {/* Bed afmetingen aanpassen */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bed aanpassen</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Breedte (cm)</p>
                        <Input
                          type="number" min={10} step={10}
                          value={selectedZoneData.zone.widthCm}
                          onChange={(e) => {
                            if (!selectedId) return;
                            const val = Math.max(10, Number(e.target.value));
                            transformZone(selectedId, selectedZoneData.zone.x, selectedZoneData.zone.y, val, selectedZoneData.zone.heightCm, selectedZoneData.zone.rotation);
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Hoogte (cm)</p>
                        <Input
                          type="number" min={10} step={10}
                          value={selectedZoneData.zone.heightCm}
                          onChange={(e) => {
                            if (!selectedId) return;
                            const val = Math.max(10, Number(e.target.value));
                            transformZone(selectedId, selectedZoneData.zone.x, selectedZoneData.zone.y, selectedZoneData.zone.widthCm, val, selectedZoneData.zone.rotation);
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Rotatie (°)</p>
                        <Input
                          type="number" step={1}
                          value={Math.round(selectedZoneData.zone.rotation)}
                          onChange={(e) => {
                            if (!selectedId) return;
                            const val = Number(e.target.value);
                            transformZone(selectedId, selectedZoneData.zone.x, selectedZoneData.zone.y, selectedZoneData.zone.widthCm, selectedZoneData.zone.heightCm, val);
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Verfijning en opmerkingen */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notities</p>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Verfijning (soort)</p>
                      <Input
                        placeholder={`Type ${selectedZoneData.plantData.name.toLowerCase()}`}
                        value={selectedZoneData.zone.label || ""}
                        onChange={(e) => {
                          if (!selectedId) return;
                          updateZoneInfo(selectedId, e.target.value, selectedZoneData.zone.notes || "");
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Opmerkingen</p>
                      <textarea
                        placeholder="bijv. Stekje van de buren, test nieuwe soort..."
                        value={selectedZoneData.zone.notes || ""}
                        onChange={(e) => {
                          if (!selectedId) return;
                          updateZoneInfo(selectedId, selectedZoneData.zone.label || "", e.target.value);
                        }}
                        className="w-full text-sm border rounded-md px-3 py-2 min-h-[60px] resize-y bg-background"
                      />
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  {/* Plant details */}
                  <PlantInfo plant={selectedZoneData.plantData} onClose={() => {}} compact />

                  <div className="h-px bg-border" />

                  {/* Companion alerts */}
                  <CompanionAlert checks={companionChecks} />

                  <Button
                    variant="ghost" size="sm"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() => { if (selectedId) { removeZone(selectedId); setMobileInfoOpen(false); } }}
                  >
                    Bed verwijderen
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Structuur geselecteerd */}
          {selectedStruct && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {STRUCTURE_LABELS[selectedStruct.type] || selectedStruct.type}
                </h3>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => { if (selectedId) toggleStructureLock(selectedId); }}
                  >
                    {selectedStruct.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => { if (selectedId) { removeStructure(selectedId); setMobileInfoOpen(false); } }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="block font-medium text-foreground">{selectedStruct.widthCm}cm</span>
                  Breedte
                </div>
                <div>
                  <span className="block font-medium text-foreground">{selectedStruct.heightCm}cm</span>
                  Hoogte
                </div>
                <div>
                  <span className="block font-medium text-foreground">{Math.round(selectedStruct.rotation)}°</span>
                  Rotatie
                </div>
              </div>

              {!mobileInfoExpanded && (
                <>
                  {selectedStruct.locked && (
                    <p className="text-xs text-muted-foreground">Vergrendeld</p>
                  )}
                  <p className="text-[11px] text-center text-muted-foreground/60">
                    Sleep omhoog voor details en bewerken
                  </p>
                </>
              )}

              {/* Uitgebreide bewerkingsview voor structuren */}
              {mobileInfoExpanded && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Afmetingen aanpassen</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Breedte (cm)</p>
                        <Input
                          type="number" min={10} step={10}
                          value={selectedStruct.widthCm}
                          onChange={(e) => {
                            if (!selectedId) return;
                            const val = Math.max(10, Number(e.target.value));
                            transformStructure(selectedId, selectedStruct.x, selectedStruct.y, val, selectedStruct.heightCm, selectedStruct.rotation);
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Hoogte (cm)</p>
                        <Input
                          type="number" min={10} step={10}
                          value={selectedStruct.heightCm}
                          onChange={(e) => {
                            if (!selectedId) return;
                            const val = Math.max(10, Number(e.target.value));
                            transformStructure(selectedId, selectedStruct.x, selectedStruct.y, selectedStruct.widthCm, val, selectedStruct.rotation);
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Rotatie (°)</p>
                        <Input
                          type="number" step={1}
                          value={Math.round(selectedStruct.rotation)}
                          onChange={(e) => {
                            if (!selectedId) return;
                            const val = Number(e.target.value);
                            transformStructure(selectedId, selectedStruct.x, selectedStruct.y, selectedStruct.widthCm, selectedStruct.heightCm, val);
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {selectedStruct.locked && (
                    <p className="text-sm text-muted-foreground">Vergrendeld</p>
                  )}

                  <Button
                    variant="ghost" size="sm"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() => { if (selectedId) { removeStructure(selectedId); setMobileInfoOpen(false); } }}
                  >
                    Structuur verwijderen
                  </Button>
                </div>
              )}
            </div>
          )}
        </MobileBottomSheet>
      </div>
    </div>
  );
}

export default function TuinPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Laden...</div>}>
      <TuinContent />
    </Suspense>
  );
}

"use client";

import { useState, useRef, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PlantPicker from "@/components/sidebar/PlantPicker";
import PlantInfo from "@/components/sidebar/PlantInfo";
import CompanionAlert from "@/components/sidebar/CompanionAlert";
import CanvasToolbar from "@/components/canvas/CanvasToolbar";
import { useGarden } from "@/lib/hooks/useGarden";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { loadGardens, exportGarden, importGarden } from "@/lib/garden/storage";
import { getPlant } from "@/lib/plants/catalog";
import { checkAllCompanions, CompanionCheck } from "@/lib/plants/companions";
import { findNearbyZones, calculatePlantPositions } from "@/lib/garden/helpers";
import { PlantData } from "@/lib/plants/types";
import { Garden } from "@/lib/garden/types";
import { createRectangleCorners, generateId } from "@/lib/garden/helpers";
import { ArrowLeft, Move, Lock, Unlock, Check } from "lucide-react";
import type { GardenCanvasHandle } from "@/components/canvas/GardenCanvas";

const GardenCanvas = dynamic(
  () => import("@/components/canvas/GardenCanvas"),
  { ssr: false }
);

const STRUCTURE_LABELS: Record<string, string> = {
  kas: "Kas", grondbak: "Grondbak", pad: "Pad", schuur: "Schuur", hek: "Hek", boom: "Boom",
};

function TuinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const canvasRef = useRef<GardenCanvasHandle>(null);
  const [editingCorners, setEditingCorners] = useState(false);
  const [sidebarPlant, setSidebarPlant] = useState<PlantData | null>(null);
  const [saveLabel, setSaveLabel] = useState("Opslaan");
  const [zoom, setZoom] = useState(1);
  const [gridVisible, setGridVisible] = useState(true);

  const initialGarden = useMemo((): Garden | undefined => {
    const id = searchParams.get("id");
    if (id) {
      const gardens = loadGardens();
      return gardens.find((g) => g.id === id);
    }
    const name = searchParams.get("name") || "Mijn Moestuin";
    const w = Number(searchParams.get("w")) || 300;
    const h = Number(searchParams.get("h")) || 1000;
    return {
      id: generateId(), name, widthCm: w, heightCm: h,
      shape: { corners: createRectangleCorners(w, h) },
      plants: [], zones: [], structures: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
  }, [searchParams]);

  const {
    garden, selectedId, selectedType, select, hasChanges,
    addZone, moveZone, transformZone, removeZone, toggleZoneLock,
    addStructure, moveStructure, transformStructure, removeStructure, toggleStructureLock,
    updateShape, save, loadGarden,
  } = useGarden(initialGarden);

  const handleSave = useCallback(() => {
    save();
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
    canvasRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    canvasRef.current?.zoomOut();
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

  const selectedStruct = useMemo(() => {
    if (!selectedId || selectedType !== "structure") return null;
    return garden.structures.find((s) => s.id === selectedId) || null;
  }, [selectedId, selectedType, garden.structures]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b bg-white">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-semibold">{garden.name}</h1>
          <span className="text-sm text-muted-foreground">
            {garden.widthCm} x {garden.heightCm}cm
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={editingCorners ? "secondary" : "outline"}
            size="sm"
            onClick={() => setEditingCorners(!editingCorners)}
          >
            <Move className="h-3.5 w-3.5 mr-1.5" />
            {editingCorners ? "Klaar" : "Hoeken aanpassen"}
          </Button>
          {hasChanges && (
            <span className="text-xs text-muted-foreground">Niet opgeslagen</span>
          )}
          <Button size="sm" onClick={handleSave} variant={saveLabel === "Opgeslagen!" ? "secondary" : "default"}>
            {saveLabel === "Opgeslagen!" && <Check className="h-3.5 w-3.5 mr-1" />}
            {saveLabel}
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
              gridVisible={gridVisible}
              onToggleGrid={() => setGridVisible(!gridVisible)}
              onExport={handleExport}
              onImport={handleImport}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                  <p className="text-sm text-muted-foreground">
                    {selectedZoneData.plantCount} planten
                    {selectedZoneData.zone.locked && " — Vergrendeld"}
                  </p>
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
          </div>
        </aside>

        {/* Canvas */}
        <GardenCanvas
          ref={canvasRef}
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

        {/* Rechterpaneel: picker */}
        <aside className="w-72 border-l bg-white overflow-y-auto p-4 space-y-4 hidden md:block">
          <h2 className="font-semibold">Gewassen & Structuren</h2>
          <p className="text-xs text-muted-foreground">
            Sleep naar het canvas
          </p>
          <PlantPicker onSelectPlant={(plant) => setSidebarPlant(plant)} />
          {sidebarPlant && (
            <PlantInfo plant={sidebarPlant} onClose={() => setSidebarPlant(null)} />
          )}
        </aside>
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

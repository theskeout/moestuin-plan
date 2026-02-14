"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import PlantPicker from "@/components/sidebar/PlantPicker";
import PlantInfo from "@/components/sidebar/PlantInfo";
import CompanionAlert from "@/components/sidebar/CompanionAlert";
import { useGarden } from "@/lib/hooks/useGarden";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { loadGardens } from "@/lib/garden/storage";
import { getPlant } from "@/lib/plants/catalog";
import { checkAllCompanions, CompanionCheck } from "@/lib/plants/companions";
import { findNearbyZones, calculatePlantPositions } from "@/lib/garden/helpers";
import { PlantData } from "@/lib/plants/types";
import { Garden } from "@/lib/garden/types";
import { createRectangleCorners, generateId } from "@/lib/garden/helpers";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Move, Lock, Unlock, Check } from "lucide-react";

// Dynamic import voor Konva (geen SSR)
const GardenCanvas = dynamic(
  () => import("@/components/canvas/GardenCanvas"),
  { ssr: false }
);

function TuinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [editingCorners, setEditingCorners] = useState(false);
  const [sidebarPlant, setSidebarPlant] = useState<PlantData | null>(null);
  const [saveLabel, setSaveLabel] = useState("Opslaan");

  // Bepaal initiële garden state
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
      id: generateId(),
      name,
      widthCm: w,
      heightCm: h,
      shape: { corners: createRectangleCorners(w, h) },
      plants: [],
      zones: [],
      structures: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [searchParams]);

  const {
    garden,
    selectedId,
    selectedType,
    select,
    hasChanges,
    addZone,
    moveZone,
    transformZone,
    removeZone,
    toggleZoneLock,
    addStructure,
    moveStructure,
    transformStructure,
    removeStructure,
    toggleStructureLock,
    updateShape,
    save,
    loadGarden,
  } = useGarden(initialGarden);

  const handleSave = useCallback(() => {
    save();
    setSaveLabel("Opgeslagen!");
    setTimeout(() => setSaveLabel("Opslaan"), 2000);
  }, [save]);

  useAutoSave(hasChanges, handleSave);

  // Kruisteelt-checks voor geselecteerde zone
  const companionChecks = useMemo((): CompanionCheck[] => {
    if (!selectedId || selectedType !== "zone") return [];
    const zone = garden.zones.find((z) => z.id === selectedId);
    if (!zone) return [];

    const nearby = findNearbyZones(zone, garden.zones, 50);
    const neighborPlantIds = nearby.map((n) => n.plantId);
    return checkAllCompanions(zone.plantId, neighborPlantIds);
  }, [selectedId, selectedType, garden.zones]);

  // Info van geselecteerde zone
  const selectedZoneData = useMemo(() => {
    if (!selectedId || selectedType !== "zone") return null;
    const zone = garden.zones.find((z) => z.id === selectedId);
    if (!zone) return null;
    const plantData = getPlant(zone.plantId);
    if (!plantData) return null;
    const positions = calculatePlantPositions(zone, plantData);
    return { zone, plantData, plantCount: positions.length };
  }, [selectedId, selectedType, garden.zones]);

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
          onLoadGarden={loadGarden}
          editingCorners={editingCorners}
        />

        {/* Sidebar */}
        <aside className="w-80 border-l bg-white overflow-y-auto p-4 space-y-4 hidden md:block">
          <h2 className="font-semibold">Gewassen & Structuren</h2>
          <p className="text-xs text-muted-foreground">
            Sleep een gewas of structuur naar het canvas
          </p>

          <PlantPicker
            onSelectPlant={(plant) => setSidebarPlant(plant)}
          />

          {sidebarPlant && (
            <PlantInfo
              plant={sidebarPlant}
              onClose={() => setSidebarPlant(null)}
            />
          )}

          {selectedZoneData && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  {selectedZoneData.plantData.icon} {selectedZoneData.plantData.name}
                </h3>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { if (selectedId) toggleZoneLock(selectedId); }}
                    title={selectedZoneData.zone.locked ? "Ontgrendel" : "Vergrendel"}
                  >
                    {selectedZoneData.zone.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => { if (selectedId) removeZone(selectedId); }}
                  >
                    Verwijder
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Breedte (cm)</p>
                  <Input
                    type="number"
                    min={10}
                    step={10}
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
                    type="number"
                    min={10}
                    step={10}
                    value={selectedZoneData.zone.heightCm}
                    onChange={(e) => {
                      if (!selectedId) return;
                      const val = Math.max(10, Number(e.target.value));
                      transformZone(selectedId, selectedZoneData.zone.x, selectedZoneData.zone.y, selectedZoneData.zone.widthCm, val, selectedZoneData.zone.rotation);
                    }}
                  />
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedZoneData.plantCount} planten
                {selectedZoneData.zone.locked && " — Vergrendeld"}
              </div>
              <CompanionAlert checks={companionChecks} />
            </div>
          )}

          {selectedId && selectedType === "structure" && (() => {
            const struct = garden.structures.find((s) => s.id === selectedId);
            if (!struct) return null;
            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    Structuur geselecteerd
                  </h3>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleStructureLock(selectedId)}
                      title={struct.locked ? "Ontgrendel" : "Vergrendel"}
                    >
                      {struct.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeStructure(selectedId)}
                    >
                      Verwijder
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Breedte (cm)</p>
                    <Input
                      type="number"
                      min={10}
                      step={10}
                      value={struct.widthCm}
                      onChange={(e) => {
                        const val = Math.max(10, Number(e.target.value));
                        transformStructure(selectedId, struct.x, struct.y, val, struct.heightCm, struct.rotation);
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Hoogte (cm)</p>
                    <Input
                      type="number"
                      min={10}
                      step={10}
                      value={struct.heightCm}
                      onChange={(e) => {
                        const val = Math.max(10, Number(e.target.value));
                        transformStructure(selectedId, struct.x, struct.y, struct.widthCm, val, struct.rotation);
                      }}
                    />
                  </div>
                </div>
                {struct.locked && (
                  <p className="text-sm text-muted-foreground">Vergrendeld</p>
                )}
              </div>
            );
          })()}
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

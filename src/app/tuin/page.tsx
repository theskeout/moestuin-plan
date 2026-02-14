"use client";

import { useState, useMemo, Suspense } from "react";
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
import { findNearbyPlants } from "@/lib/garden/helpers";
import { PlantData } from "@/lib/plants/types";
import { Garden } from "@/lib/garden/types";
import { createRectangleCorners, generateId } from "@/lib/garden/helpers";
import { ArrowLeft, Move } from "lucide-react";

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
  const [dragPlantId] = useState<string | null>(null);

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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [searchParams]);

  const {
    garden,
    selectedPlantId,
    setSelectedPlantId,
    hasChanges,
    addPlant,
    movePlant,
    removePlant,
    updateShape,
    save,
    loadGarden,
  } = useGarden(initialGarden);

  useAutoSave(hasChanges, save);

  // Kruisteelt-checks voor geselecteerde plant
  const companionChecks = useMemo((): CompanionCheck[] => {
    if (!selectedPlantId) return [];
    const placed = garden.plants.find((p) => p.id === selectedPlantId);
    if (!placed) return [];

    const nearby = findNearbyPlants(placed, garden.plants, 150);
    const neighborPlantIds = nearby.map((n) => n.plantId);
    return checkAllCompanions(placed.plantId, neighborPlantIds);
  }, [selectedPlantId, garden.plants]);

  // Info van geselecteerde plant op canvas
  const selectedPlantData = useMemo(() => {
    if (!selectedPlantId) return null;
    const placed = garden.plants.find((p) => p.id === selectedPlantId);
    if (!placed) return null;
    return getPlant(placed.plantId) || null;
  }, [selectedPlantId, garden.plants]);

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
            {(garden.widthCm / 100).toFixed(1)} x {(garden.heightCm / 100).toFixed(1)}m
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
          <Button size="sm" onClick={save}>
            Opslaan
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <GardenCanvas
          garden={garden}
          selectedPlantId={selectedPlantId}
          onSelectPlant={setSelectedPlantId}
          onMovePlant={movePlant}
          onAddPlant={addPlant}
          onUpdateShape={updateShape}
          onLoadGarden={loadGarden}
          editingCorners={editingCorners}
          dragPlantId={dragPlantId}
        />

        {/* Sidebar */}
        <aside className="w-80 border-l bg-white overflow-y-auto p-4 space-y-4 hidden md:block">
          <h2 className="font-semibold">Gewassen</h2>
          <p className="text-xs text-muted-foreground">
            Sleep een gewas naar het canvas
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

          {selectedPlantData && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  Geselecteerd: {selectedPlantData.icon} {selectedPlantData.name}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (selectedPlantId) removePlant(selectedPlantId);
                  }}
                >
                  Verwijder
                </Button>
              </div>
              <CompanionAlert checks={companionChecks} />
            </div>
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

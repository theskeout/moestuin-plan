"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Garden, CropZone, Structure, GardenShape, StructureType } from "@/lib/garden/types";
import { generateId, createRectangleCorners, snapToGrid, getDefaultZoneSize, getStructureDefaults } from "@/lib/garden/helpers";
import { saveGardenAsync, saveGardenSync } from "@/lib/garden/storage";
import { getPlant } from "@/lib/plants/catalog";

export type SelectedType = "zone" | "structure";

export function useGarden(initialGarden?: Garden) {
  const [garden, setGarden] = useState<Garden>(
    initialGarden || {
      id: generateId(),
      name: "Mijn Moestuin",
      widthCm: 300,
      heightCm: 1000,
      shape: { corners: createRectangleCorners(300, 1000) },
      plants: [],
      zones: [],
      structures: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<SelectedType>("zone");
  const [hasChanges, setHasChanges] = useState(false);

  // --- Undo stack ---
  const MAX_UNDO = 50;
  const undoStackRef = useRef<{ zones: CropZone[]; structures: Structure[] }[]>([]);

  /** Wrap setGarden: push snapshot op undo-stack VOOR de mutatie */
  const setGardenWithUndo = useCallback(
    (updater: (prev: Garden) => Garden) => {
      setGarden((prev) => {
        const next = updater(prev);
        // Alleen pushen als zones of structures daadwerkelijk veranderen
        if (next.zones !== prev.zones || next.structures !== prev.structures) {
          undoStackRef.current.push({
            zones: prev.zones,
            structures: prev.structures,
          });
          if (undoStackRef.current.length > MAX_UNDO) {
            undoStackRef.current.shift();
          }
        }
        return next;
      });
    },
    []
  );

  const undo = useCallback(() => {
    const snapshot = undoStackRef.current.pop();
    if (!snapshot) return;
    setGarden((prev) => ({
      ...prev,
      zones: snapshot.zones,
      structures: snapshot.structures,
      updatedAt: new Date().toISOString(),
    }));
    setHasChanges(true);
  }, []);

  // --- Clipboard (copy/paste) ---
  const clipboardRef = useRef<{ type: SelectedType; zone?: CropZone; structure?: Structure } | null>(null);

  const copySelected = useCallback(() => {
    if (!selectedId) return;
    if (selectedType === "zone") {
      const zone = garden.zones.find((z) => z.id === selectedId);
      if (zone) clipboardRef.current = { type: "zone", zone: { ...zone } };
    } else {
      const struct = garden.structures.find((s) => s.id === selectedId);
      if (struct) clipboardRef.current = { type: "structure", structure: { ...struct } };
    }
  }, [selectedId, selectedType, garden.zones, garden.structures]);

  const pasteClipboard = useCallback(() => {
    const clip = clipboardRef.current;
    if (!clip) return;
    if (clip.type === "zone" && clip.zone) {
      const newZone: CropZone = {
        ...clip.zone,
        id: generateId(),
        x: snapToGrid(clip.zone.x + 20),
        y: snapToGrid(clip.zone.y + 20),
        locked: false,
      };
      clipboardRef.current = { type: "zone", zone: { ...newZone } };
      setGardenWithUndo((prev) => ({
        ...prev,
        zones: [...prev.zones, newZone],
        updatedAt: new Date().toISOString(),
      }));
      setSelectedId(newZone.id);
      setSelectedType("zone");
    } else if (clip.type === "structure" && clip.structure) {
      const newStruct: Structure = {
        ...clip.structure,
        id: generateId(),
        x: snapToGrid(clip.structure.x + 20),
        y: snapToGrid(clip.structure.y + 20),
        locked: false,
      };
      clipboardRef.current = { type: "structure", structure: { ...newStruct } };
      setGardenWithUndo((prev) => ({
        ...prev,
        structures: [...prev.structures, newStruct],
        updatedAt: new Date().toISOString(),
      }));
      setSelectedId(newStruct.id);
      setSelectedType("structure");
    }
    setHasChanges(true);
  }, [setGardenWithUndo]);

  const select = useCallback((id: string | null, type: SelectedType = "zone") => {
    setSelectedId(id);
    setSelectedType(type);
  }, []);

  // --- Zones CRUD ---

  const addZone = useCallback(
    (plantId: string, x: number, y: number) => {
      const plantData = getPlant(plantId);
      const size = plantData
        ? getDefaultZoneSize(plantData)
        : { widthCm: 30, heightCm: 30 };

      const newZone: CropZone = {
        id: generateId(),
        plantId,
        x: snapToGrid(x - size.widthCm / 2),
        y: snapToGrid(y - size.heightCm / 2),
        widthCm: size.widthCm,
        heightCm: size.heightCm,
        rotation: 0,
        locked: false,
      };
      setGardenWithUndo((prev) => ({
        ...prev,
        zones: [...prev.zones, newZone],
        updatedAt: new Date().toISOString(),
      }));
      setSelectedId(newZone.id);
      setSelectedType("zone");
      setHasChanges(true);
      return newZone;
    },
    [setGardenWithUndo]
  );

  const moveZone = useCallback((id: string, x: number, y: number) => {
    setGardenWithUndo((prev) => {
      const zone = prev.zones.find((z) => z.id === id);
      if (zone?.locked) return prev;
      return {
        ...prev,
        zones: prev.zones.map((z) =>
          z.id === id ? { ...z, x: snapToGrid(x), y: snapToGrid(y) } : z
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    setHasChanges(true);
  }, [setGardenWithUndo]);

  const transformZone = useCallback((id: string, x: number, y: number, widthCm: number, heightCm: number, rotation: number) => {
    setGardenWithUndo((prev) => {
      const zone = prev.zones.find((z) => z.id === id);
      if (zone?.locked) return prev;
      return {
        ...prev,
        zones: prev.zones.map((z) =>
          z.id === id
            ? {
                ...z,
                x: snapToGrid(x),
                y: snapToGrid(y),
                widthCm: snapToGrid(Math.max(widthCm, 10)),
                heightCm: snapToGrid(Math.max(heightCm, 10)),
                rotation,
              }
            : z
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    setHasChanges(true);
  }, [setGardenWithUndo]);

  const duplicateZone = useCallback((id: string) => {
    setGardenWithUndo((prev) => {
      const zone = prev.zones.find((z) => z.id === id);
      if (!zone) return prev;
      const newZone: CropZone = {
        ...zone,
        id: generateId(),
        x: snapToGrid(zone.x + 20),
        y: snapToGrid(zone.y + 20),
        locked: false,
      };
      return {
        ...prev,
        zones: [...prev.zones, newZone],
        updatedAt: new Date().toISOString(),
      };
    });
    setHasChanges(true);
  }, [setGardenWithUndo]);

  const removeZone = useCallback((id: string) => {
    setGardenWithUndo((prev) => ({
      ...prev,
      zones: prev.zones.filter((z) => z.id !== id),
      updatedAt: new Date().toISOString(),
    }));
    setSelectedId((prev) => (prev === id ? null : prev));
    setHasChanges(true);
  }, [setGardenWithUndo]);

  const toggleZoneLock = useCallback((id: string) => {
    setGardenWithUndo((prev) => ({
      ...prev,
      zones: prev.zones.map((z) =>
        z.id === id ? { ...z, locked: !z.locked } : z
      ),
      updatedAt: new Date().toISOString(),
    }));
    setHasChanges(true);
  }, [setGardenWithUndo]);

  const updateZoneInfo = useCallback((id: string, label: string, notes: string) => {
    setGardenWithUndo((prev) => ({
      ...prev,
      zones: prev.zones.map((z) =>
        z.id === id ? { ...z, label, notes } : z
      ),
      updatedAt: new Date().toISOString(),
    }));
    setHasChanges(true);
  }, [setGardenWithUndo]);

  // --- Structures CRUD ---

  const addStructure = useCallback(
    (type: StructureType, x: number, y: number, customLabel?: string, customIcon?: string) => {
      const size = getStructureDefaults(type);
      const newStruct: Structure = {
        id: generateId(),
        type,
        x: snapToGrid(x - size.widthCm / 2),
        y: snapToGrid(y - size.heightCm / 2),
        widthCm: size.widthCm,
        heightCm: size.heightCm,
        rotation: 0,
        locked: false,
        ...(customLabel ? { customLabel } : {}),
        ...(customIcon ? { customIcon } : {}),
      };
      setGardenWithUndo((prev) => ({
        ...prev,
        structures: [...prev.structures, newStruct],
        updatedAt: new Date().toISOString(),
      }));
      setSelectedId(newStruct.id);
      setSelectedType("structure");
      setHasChanges(true);
      return newStruct;
    },
    [setGardenWithUndo]
  );

  const moveStructure = useCallback((id: string, x: number, y: number) => {
    setGardenWithUndo((prev) => {
      const struct = prev.structures.find((s) => s.id === id);
      if (struct?.locked) return prev;
      return {
        ...prev,
        structures: prev.structures.map((s) =>
          s.id === id ? { ...s, x: snapToGrid(x), y: snapToGrid(y) } : s
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    setHasChanges(true);
  }, [setGardenWithUndo]);

  const transformStructure = useCallback((id: string, x: number, y: number, widthCm: number, heightCm: number, rotation: number) => {
    setGardenWithUndo((prev) => {
      const struct = prev.structures.find((s) => s.id === id);
      if (struct?.locked) return prev;
      return {
        ...prev,
        structures: prev.structures.map((s) =>
          s.id === id
            ? {
                ...s,
                x: snapToGrid(x),
                y: snapToGrid(y),
                widthCm: snapToGrid(Math.max(widthCm, 10)),
                heightCm: snapToGrid(Math.max(heightCm, 10)),
                rotation,
              }
            : s
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    setHasChanges(true);
  }, [setGardenWithUndo]);

  const duplicateStructure = useCallback((id: string) => {
    setGardenWithUndo((prev) => {
      const struct = prev.structures.find((s) => s.id === id);
      if (!struct) return prev;
      const newStruct: Structure = {
        ...struct,
        id: generateId(),
        x: snapToGrid(struct.x + 20),
        y: snapToGrid(struct.y + 20),
        locked: false,
      };
      return {
        ...prev,
        structures: [...prev.structures, newStruct],
        updatedAt: new Date().toISOString(),
      };
    });
    setHasChanges(true);
  }, [setGardenWithUndo]);

  const removeStructure = useCallback((id: string) => {
    setGardenWithUndo((prev) => ({
      ...prev,
      structures: prev.structures.filter((s) => s.id !== id),
      updatedAt: new Date().toISOString(),
    }));
    setSelectedId((prev) => (prev === id ? null : prev));
    setHasChanges(true);
  }, [setGardenWithUndo]);

  const toggleStructureLock = useCallback((id: string) => {
    setGardenWithUndo((prev) => ({
      ...prev,
      structures: prev.structures.map((s) =>
        s.id === id ? { ...s, locked: !s.locked } : s
      ),
      updatedAt: new Date().toISOString(),
    }));
    setHasChanges(true);
  }, [setGardenWithUndo]);

  // --- Overig ---

  const updateShape = useCallback((shape: GardenShape) => {
    setGarden((prev) => ({
      ...prev,
      shape,
      updatedAt: new Date().toISOString(),
    }));
    setHasChanges(true);
  }, []);
  // Note: updateShape gebruikt setGarden (geen undo) — contouraanpassingen zijn geen zone/structure mutaties

  const updateGardenInfo = useCallback(
    (name: string, widthCm: number, heightCm: number) => {
      setGarden((prev) => ({
        ...prev,
        name,
        widthCm,
        heightCm,
        shape: { corners: createRectangleCorners(widthCm, heightCm) },
        updatedAt: new Date().toISOString(),
      }));
      setHasChanges(true);
    },
    []
  );

  /** Pas alleen afmetingen aan, behoud bestaande hoeken */
  const updateGardenSize = useCallback(
    (name: string, widthCm: number, heightCm: number) => {
      setGarden((prev) => ({
        ...prev,
        name,
        widthCm,
        heightCm,
        updatedAt: new Date().toISOString(),
      }));
      setHasChanges(true);
    },
    []
  );

  const save = useCallback(async () => {
    try {
      await saveGardenAsync(garden);
    } catch {
      // Fallback naar localStorage bij Supabase-fout
      saveGardenSync(garden);
    }
    setHasChanges(false);
  }, [garden]);

  const loadGarden = useCallback((g: Garden) => {
    setGarden({
      ...g,
      zones: (g.zones || []).map((z) => ({ ...z, locked: z.locked ?? false })),
      structures: (g.structures || []).map((s) => ({ ...s, locked: s.locked ?? false })),
      plants: g.plants || [],
    });
    setHasChanges(false);
    setSelectedId(null);
  }, []);

  // Save bij paginaverlating als er onopgeslagen wijzigingen zijn
  const gardenRef = useRef(garden);
  gardenRef.current = garden;
  const hasChangesRef = useRef(hasChanges);
  hasChangesRef.current = hasChanges;

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasChangesRef.current) {
        // Altijd localStorage als synchroon vangnet bij paginaverlating
        saveGardenSync(gardenRef.current);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      handleBeforeUnload();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return {
    garden,
    setGarden,
    selectedId,
    selectedType,
    select,
    hasChanges,
    setHasChanges,
    addZone,
    moveZone,
    transformZone,
    removeZone,
    duplicateZone,
    toggleZoneLock,
    updateZoneInfo,
    addStructure,
    moveStructure,
    transformStructure,
    removeStructure,
    duplicateStructure,
    toggleStructureLock,
    updateShape,
    updateGardenInfo,
    updateGardenSize,
    save,
    loadGarden,
    undo,
    copySelected,
    pasteClipboard,
  };
}

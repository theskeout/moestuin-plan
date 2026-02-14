"use client";

import { useState, useCallback } from "react";
import { Garden, CropZone, Structure, GardenShape, StructureType } from "@/lib/garden/types";
import { generateId, createRectangleCorners, snapToGrid, getDefaultZoneSize, getStructureDefaults } from "@/lib/garden/helpers";
import { saveGarden } from "@/lib/garden/storage";
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
      };
      setGarden((prev) => ({
        ...prev,
        zones: [...prev.zones, newZone],
        updatedAt: new Date().toISOString(),
      }));
      setHasChanges(true);
      return newZone;
    },
    []
  );

  const moveZone = useCallback((id: string, x: number, y: number) => {
    setGarden((prev) => ({
      ...prev,
      zones: prev.zones.map((z) =>
        z.id === id ? { ...z, x: snapToGrid(x), y: snapToGrid(y) } : z
      ),
      updatedAt: new Date().toISOString(),
    }));
    setHasChanges(true);
  }, []);

  const resizeZone = useCallback((id: string, widthCm: number, heightCm: number) => {
    setGarden((prev) => ({
      ...prev,
      zones: prev.zones.map((z) =>
        z.id === id
          ? { ...z, widthCm: snapToGrid(Math.max(widthCm, 10)), heightCm: snapToGrid(Math.max(heightCm, 10)) }
          : z
      ),
      updatedAt: new Date().toISOString(),
    }));
    setHasChanges(true);
  }, []);

  const removeZone = useCallback((id: string) => {
    setGarden((prev) => ({
      ...prev,
      zones: prev.zones.filter((z) => z.id !== id),
      updatedAt: new Date().toISOString(),
    }));
    setSelectedId((prev) => (prev === id ? null : prev));
    setHasChanges(true);
  }, []);

  // --- Structures CRUD ---

  const addStructure = useCallback(
    (type: StructureType, x: number, y: number) => {
      const size = getStructureDefaults(type);
      const newStruct: Structure = {
        id: generateId(),
        type,
        x: snapToGrid(x - size.widthCm / 2),
        y: snapToGrid(y - size.heightCm / 2),
        widthCm: size.widthCm,
        heightCm: size.heightCm,
        rotation: 0,
      };
      setGarden((prev) => ({
        ...prev,
        structures: [...prev.structures, newStruct],
        updatedAt: new Date().toISOString(),
      }));
      setHasChanges(true);
      return newStruct;
    },
    []
  );

  const moveStructure = useCallback((id: string, x: number, y: number) => {
    setGarden((prev) => ({
      ...prev,
      structures: prev.structures.map((s) =>
        s.id === id ? { ...s, x: snapToGrid(x), y: snapToGrid(y) } : s
      ),
      updatedAt: new Date().toISOString(),
    }));
    setHasChanges(true);
  }, []);

  const resizeStructure = useCallback((id: string, widthCm: number, heightCm: number) => {
    setGarden((prev) => ({
      ...prev,
      structures: prev.structures.map((s) =>
        s.id === id
          ? { ...s, widthCm: snapToGrid(Math.max(widthCm, 10)), heightCm: snapToGrid(Math.max(heightCm, 10)) }
          : s
      ),
      updatedAt: new Date().toISOString(),
    }));
    setHasChanges(true);
  }, []);

  const removeStructure = useCallback((id: string) => {
    setGarden((prev) => ({
      ...prev,
      structures: prev.structures.filter((s) => s.id !== id),
      updatedAt: new Date().toISOString(),
    }));
    setSelectedId((prev) => (prev === id ? null : prev));
    setHasChanges(true);
  }, []);

  // --- Overig ---

  const updateShape = useCallback((shape: GardenShape) => {
    setGarden((prev) => ({
      ...prev,
      shape,
      updatedAt: new Date().toISOString(),
    }));
    setHasChanges(true);
  }, []);

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

  const save = useCallback(() => {
    saveGarden(garden);
    setHasChanges(false);
  }, [garden]);

  const loadGarden = useCallback((g: Garden) => {
    setGarden({
      ...g,
      zones: g.zones || [],
      structures: g.structures || [],
      plants: g.plants || [],
    });
    setHasChanges(false);
    setSelectedId(null);
  }, []);

  return {
    garden,
    selectedId,
    selectedType,
    select,
    hasChanges,
    addZone,
    moveZone,
    resizeZone,
    removeZone,
    addStructure,
    moveStructure,
    resizeStructure,
    removeStructure,
    updateShape,
    updateGardenInfo,
    save,
    loadGarden,
  };
}

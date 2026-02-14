"use client";

import { useState, useCallback } from "react";
import { Garden, PlacedPlant, GardenShape } from "@/lib/garden/types";
import { generateId, createRectangleCorners, snapToGrid } from "@/lib/garden/helpers";
import { saveGarden } from "@/lib/garden/storage";

export function useGarden(initialGarden?: Garden) {
  const [garden, setGarden] = useState<Garden>(
    initialGarden || {
      id: generateId(),
      name: "Mijn Moestuin",
      widthCm: 300,
      heightCm: 1000,
      shape: { corners: createRectangleCorners(300, 1000) },
      plants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  );

  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const addPlant = useCallback(
    (plantId: string, x: number, y: number) => {
      const newPlant: PlacedPlant = {
        id: generateId(),
        plantId,
        x: snapToGrid(x),
        y: snapToGrid(y),
        rotation: 0,
      };
      setGarden((prev) => ({
        ...prev,
        plants: [...prev.plants, newPlant],
        updatedAt: new Date().toISOString(),
      }));
      setHasChanges(true);
      return newPlant;
    },
    []
  );

  const movePlant = useCallback((id: string, x: number, y: number) => {
    setGarden((prev) => ({
      ...prev,
      plants: prev.plants.map((p) =>
        p.id === id ? { ...p, x: snapToGrid(x), y: snapToGrid(y) } : p
      ),
      updatedAt: new Date().toISOString(),
    }));
    setHasChanges(true);
  }, []);

  const removePlant = useCallback((id: string) => {
    setGarden((prev) => ({
      ...prev,
      plants: prev.plants.filter((p) => p.id !== id),
      updatedAt: new Date().toISOString(),
    }));
    setSelectedPlantId((prev) => (prev === id ? null : prev));
    setHasChanges(true);
  }, []);

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
    setGarden(g);
    setHasChanges(false);
    setSelectedPlantId(null);
  }, []);

  return {
    garden,
    selectedPlantId,
    setSelectedPlantId,
    hasChanges,
    addPlant,
    movePlant,
    removePlant,
    updateShape,
    updateGardenInfo,
    save,
    loadGarden,
  };
}

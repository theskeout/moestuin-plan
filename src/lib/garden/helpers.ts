import { Point, PlacedPlant, CropZone, StructureType } from "./types";
import { PlantData } from "@/lib/plants/types";

const GRID_SIZE = 10; // 10cm raster

export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export function snapPointToGrid(point: Point): Point {
  return {
    x: snapToGrid(point.x),
    y: snapToGrid(point.y),
  };
}

export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y;
    const xj = polygon[j].x,
      yj = polygon[j].y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function findNearbyPlants(
  plant: PlacedPlant,
  allPlants: PlacedPlant[],
  radiusCm: number = 100
): PlacedPlant[] {
  return allPlants.filter((p) => {
    if (p.id === plant.id) return false;
    return distance({ x: plant.x, y: plant.y }, { x: p.x, y: p.y }) <= radiusCm;
  });
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createRectangleCorners(widthCm: number, heightCm: number): Point[] {
  return [
    { x: 0, y: 0 },
    { x: widthCm, y: 0 },
    { x: widthCm, y: heightCm },
    { x: 0, y: heightCm },
  ];
}

// Converteer cm naar canvas pixels (schaal)
export function cmToPixels(cm: number, scale: number): number {
  return cm * scale;
}

export function pixelsToCm(pixels: number, scale: number): number {
  return pixels / scale;
}

// --- Nieuwe helpers voor zones en structuren ---

/** Bereken individuele plantposities binnen een zone als stippengrid */
export function calculatePlantPositions(
  zone: CropZone,
  plant: PlantData
): Point[] {
  const positions: Point[] = [];
  const spacingX = plant.spacingCm;
  const spacingY = plant.rowSpacingCm;

  if (spacingX <= 0 || spacingY <= 0) return positions;

  // Begin met halve spacing als marge, dan elke spacing een positie
  const marginX = spacingX / 2;
  const marginY = spacingY / 2;

  for (let y = marginY; y <= zone.heightCm - marginY; y += spacingY) {
    for (let x = marginX; x <= zone.widthCm - marginX; x += spacingX) {
      positions.push({ x, y });
    }
  }

  return positions;
}

/** Standaard zone-afmeting bij drop: ~3x spacing in beide richtingen */
export function getDefaultZoneSize(plant: PlantData): { widthCm: number; heightCm: number } {
  const w = snapToGrid(Math.max(plant.spacingCm * 3, 30));
  const h = snapToGrid(Math.max(plant.rowSpacingCm * 3, 30));
  return { widthCm: w, heightCm: h };
}

/** Standaardmaten per structuurtype */
export function getStructureDefaults(type: StructureType): { widthCm: number; heightCm: number } {
  switch (type) {
    case "kas":
      return { widthCm: 200, heightCm: 400 };
    case "grondbak":
      return { widthCm: 100, heightCm: 200 };
    case "pad":
      return { widthCm: 60, heightCm: 200 };
    case "schuur":
      return { widthCm: 200, heightCm: 200 };
  }
}

/** Bereken minimale afstand tussen randen van twee zones */
export function zonesEdgeDistance(
  a: { x: number; y: number; widthCm: number; heightCm: number },
  b: { x: number; y: number; widthCm: number; heightCm: number }
): number {
  // Bereken horizontale en verticale gap
  const gapX = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.widthCm, b.x + b.widthCm));
  const gapY = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.heightCm, b.y + b.heightCm));
  return Math.sqrt(gapX * gapX + gapY * gapY);
}

/** Vind nabije zones (randen < margin cm) */
export function findNearbyZones(
  zone: CropZone,
  allZones: CropZone[],
  marginCm: number = 50
): CropZone[] {
  return allZones.filter((z) => {
    if (z.id === zone.id) return false;
    return zonesEdgeDistance(zone, z) <= marginCm;
  });
}

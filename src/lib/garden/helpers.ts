import { Point, PlacedPlant } from "./types";

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

export interface Point {
  x: number;
  y: number;
}

export interface GardenShape {
  corners: Point[]; // polygoon hoekpunten in cm
}

export interface PlacedPlant {
  id: string;
  plantId: string; // verwijst naar PlantData.id
  x: number;       // positie in cm
  y: number;       // positie in cm
  rotation: number; // graden
}

export interface Garden {
  id: string;
  name: string;
  widthCm: number;
  heightCm: number;
  shape: GardenShape;
  plants: PlacedPlant[];
  createdAt: string;
  updatedAt: string;
}

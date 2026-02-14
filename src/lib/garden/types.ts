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

export type StructureType = "kas" | "grondbak" | "pad" | "schuur" | "hek" | "boom";

export interface Structure {
  id: string;
  type: StructureType;
  x: number;       // positie in cm
  y: number;       // positie in cm
  widthCm: number;
  heightCm: number;
  rotation: number;
  locked: boolean;
}

export interface CropZone {
  id: string;
  plantId: string; // verwijst naar PlantData.id
  x: number;       // positie in cm (linkerbovenhoek)
  y: number;       // positie in cm (linkerbovenhoek)
  widthCm: number;
  heightCm: number;
  rotation: number;
  locked: boolean;
  label?: string;  // bijv. "Platte peterselie" als verfijning
  notes?: string;  // vrije opmerkingen
}

export interface Garden {
  id: string;
  name: string;
  widthCm: number;
  heightCm: number;
  shape: GardenShape;
  plants: PlacedPlant[];    // legacy — bewaard voor migratie
  zones: CropZone[];
  structures: Structure[];
  createdAt: string;
  updatedAt: string;
}

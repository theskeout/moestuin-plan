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

export type StructureType = "kas" | "grondbak" | "pad" | "schuur" | "hek" | "boom" | "compostbak" | "custom";

export interface Structure {
  id: string;
  type: StructureType;
  x: number;       // positie in cm
  y: number;       // positie in cm
  widthCm: number;
  heightCm: number;
  rotation: number;
  locked: boolean;
  customLabel?: string;  // naam voor custom structuren
  customIcon?: string;   // emoji voor custom structuren
}

export type ZoneStatus =
  | "planned"        // Gepland, nog niet gezaaid
  | "sown-indoor"    // Voorgezaaid onder glas
  | "sown-outdoor"   // Buiten gezaaid
  | "transplanted"   // Uitgeplant
  | "growing"        // Groeit
  | "harvesting"     // Aan het oogsten
  | "done";          // Klaar dit seizoen

export interface ZoneEvent {
  id: string;
  type: "sown" | "transplanted" | "harvested" | "task-done" | "note";
  date: string;      // ISO date
  taskId?: string;
  notes?: string;
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
  status?: ZoneStatus;         // default "planned"
  season?: number;             // jaar, bijv. 2026
  events?: ZoneEvent[];        // lifecycle events
  completedTasks?: Record<string, string>;  // taskId -> ISO datum laatste afronding
}

// Tuin delen — geïmplementeerd via garden_members en garden_invites tabellen

// TODO: Tuin verwijderen — bevestigingsdialoog toevoegen, gaat nu te makkelijk per ongeluk

// TODO: Structuur: compostbak toevoegen als nieuw StructureType

// TODO: Copy-paste functie voor zones en structuren op canvas (Ctrl+C/V of dubbel-klik dupliceren)

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
  postcode?: string;                // Postcode voor deze tuin (bepaalt KNMI-station)
  role?: "owner" | "member";       // niet opgeslagen, bijgevuld bij laden
  memberCount?: number;            // niet opgeslagen, bijgevuld bij laden
}

export interface MemberInfo {
  id: string;
  userId: string;
  email: string;
  role: "owner" | "member";
  createdAt: string;
}

export interface InviteInfo {
  id: string;
  gardenId: string;
  gardenName?: string;
  email: string;
  token: string;
  status: "pending" | "accepted";
  createdAt: string;
}

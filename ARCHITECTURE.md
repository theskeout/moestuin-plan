# Architectuur — Moestuin Planner

## Overzicht

Single-page applicatie voor het visueel ontwerpen van moestuinen. De gebruiker sleept gewassen en structuren op een interactief canvas, stelt afmetingen in, en krijgt feedback over plantcombinaties.

## Tech Stack

| Laag | Technologie |
|------|-------------|
| Framework | Next.js 14 (App Router) |
| UI | React 18, Tailwind CSS, shadcn/ui |
| Canvas | Konva.js, react-konva |
| Persistentie | localStorage (gast) / Supabase (ingelogd) |
| Auth | Supabase Auth (email/wachtwoord) |
| Hosting | Vercel |
| Types | TypeScript 5 (strict) |

## Pagina's

| Route | Component | Functie |
|-------|-----------|---------|
| `/` | `app/page.tsx` | Landing page, tuin aanmaken/openen |
| `/tuin` | `app/tuin/page.tsx` | Hoofdpagina: canvas + sidebars |
| `/login` | `app/login/page.tsx` | Inloggen/registreren |

## Componentenstructuur

```
TuinPage
├── Header (naam, afmetingen, export/import, opslaan)
├── Linker Sidebar (aside)
│   ├── CanvasToolbar (zoom, grid)
│   └── Selectie-info
│       ├── Zone details (afmetingen, rotatie, notities)
│       ├── PlantInfo (compact)
│       ├── CompanionAlert
│       └── Structuur details
├── GardenCanvas (Konva Stage)
│   ├── GridLayer
│   ├── PlotOutline (tuinvorm, hoekpunten)
│   ├── StructureItem[] (kas, pad, schuur, etc.)
│   ├── CropZoneItem[] (gewaszones met PlantItem[])
│   └── Transformer (resize + rotatie)
└── Rechter Sidebar (Tabs)
    └── Tab "Toevoegen"
        ├── Structuren (inklapbaar)
        ├── Gewassen (inklapbaar, standaard open)
        │   ├── Zoekbalk + toevoegen-knop
        │   └── Categorietabs (Groente/Fruit/Kruiden/Sier)
        └── PlantInfo (geselecteerde plant details)
```

## Datamodel

### Garden
```typescript
{
  id: string
  name: string
  widthCm: number
  heightCm: number
  shape: { corners: Point[] }      // Polygoon tuinvorm
  zones: CropZone[]                // Gewaszones
  structures: Structure[]          // Structuren (kas, pad, etc.)
  plants: PlacedPlant[]            // Legacy, niet meer actief
}
```

### CropZone
```typescript
{
  id: string
  plantId: string                  // Verwijst naar PlantData.id
  x, y: number                    // Positie in cm
  widthCm, heightCm: number
  rotation: number
  locked: boolean
  label?: string                   // Verfijning (bijv. "Platte peterselie")
  notes?: string                   // Vrije notities
}
```

### PlantData
```typescript
{
  id: string
  name: string
  icon: string                     // Emoji
  color: string                    // Hex kleur
  category: "groente" | "fruit" | "kruiden" | "sier"
  spacingCm: number
  rowSpacingCm: number
  sunNeed: "vol" | "halfschaduw" | "schaduw"
  waterNeed: "laag" | "gemiddeld" | "hoog"
  sowIndoor: MonthRange | null
  sowOutdoor: MonthRange | null
  harvest: MonthRange
  companions: { good: string[], bad: string[] }
}
```

## State Management

Geen externe state library. Alles via React hooks:

- **`useGarden`** — Centrale hook voor garden state (zones, structuren, selectie, CRUD operaties)
- **`useAutoSave`** — Automatisch opslaan naar localStorage bij wijzigingen
- State flow: `useGarden` → props → canvas/sidebar componenten

## Data Flow

```
plants.json (86+ built-in gewassen)
     ↓
catalog.ts → getAllPlants() → merged met overrides + custom planten (uit cache)
     ↓
Storage abstractie (src/lib/storage/)
  ├── LocalStorage (gast)
  │     - moestuin-plan-gardens
  │     - moestuin-custom-plants
  │     - moestuin-plant-overrides
  └── Supabase (ingelogd)
        - gardens tabel (RLS per user)
        - custom_plants tabel (RLS per user)
        - plant_overrides tabel (RLS per user)
```

## Auth & Gastmodus

| Feature | Gast | Ingelogd |
|---------|------|----------|
| Tuinen maken/bewerken | Ja (localStorage) | Ja (Supabase) |
| Gewassen bekijken | Ja | Ja |
| Gewassen bewerken/toevoegen | Nee | Ja |
| Plant overrides | Nee | Ja |
| Data migratie | - | Na eerste login |

## Canvas (Konva)

- **Coördinatensysteem:** Centimeters. Scale-factor berekend o.b.v. viewport.
- **Interactie:** Drag & drop (planten vanuit sidebar), pan (scroll), zoom (ctrl+scroll/pinch)
- **Transformer:** Resize + rotatie voor zones en structuren. Shift = snap naar 45 graden.
- **Tuinvorm:** Polygoon met versleepbare hoekpunten. Punten toevoegen (klik middenpunt segment) en verwijderen (dubbelklik).

## Geplande architectuurwijzigingen

1. **Planner module:** Zaai- en oogstkalender, reminders

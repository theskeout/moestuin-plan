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
│   ├── Zoekbalk (zoek gewas op canvas)
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
    ├── Tab "Toevoegen"
    │   ├── Structuren (inklapbaar)
    │   ├── Gewassen (inklapbaar, standaard open)
    │   │   ├── Zoekbalk + toevoegen-knop
    │   │   └── Categorietabs (Groente/Fruit/Kruiden/Sier)
    │   └── PlantInfo (geselecteerde plant details)
    └── Tab "Planning"
        ├── PlanningTab (compacte sidebar-weergave)
        │   ├── Nu te doen (huidige maand taken)
        │   ├── Waarschuwingen (ziektes/plagen)
        │   ├── Rotatie-waarschuwingen
        │   └── Binnenkort (volgende maand)
        └── PlanningView (full-screen dialog)
            ├── Kalender (12-maanden grid per gewas)
            ├── Taken (takenlijst met checkboxes)
            ├── Ontdek (alle 86+ gewassen kalender)
            ├── Rotatie (gewasrotatie + archief)
            └── Regio (KNMI-station instellingen)
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
  status?: ZoneStatus              // "planned" | "sown-indoor" | "sown-outdoor" | ...
  season?: number                  // Seizoensjaar (bijv. 2026)
  events?: ZoneEvent[]             // Lifecycle events (gezaaid, geplant, etc.)
  completedTasks?: string[]        // IDs van afgeronde onderhoudstaken
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
- **`usePlanning`** — Planning hook (taken, rotatie, regio-instellingen, seizoen-archief)
- **`useAutoSave`** — Automatisch opslaan naar localStorage bij wijzigingen
- State flow: `useGarden` → `usePlanning` → props → canvas/sidebar componenten

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
  │     - moestuin-user-settings
  │     - moestuin-season-archives-{gardenId}
  └── Supabase (ingelogd)
        - gardens tabel (RLS per user)
        - custom_plants tabel (RLS per user)
        - plant_overrides tabel (RLS per user)
        - user_settings tabel (RLS per user)
        - season_archives tabel (RLS per garden members)
```

## Auth & Gastmodus

| Feature | Gast | Ingelogd |
|---------|------|----------|
| Tuinen maken/bewerken | Ja (localStorage) | Ja (Supabase) |
| Gewassen bekijken | Ja | Ja |
| Gewassen bewerken/toevoegen | Nee | Ja |
| Plant overrides | Nee | Ja |
| Planning & taken | Ja | Ja |
| Rotatie-archief | Ja (localStorage) | Ja (Supabase) |
| Data migratie | - | Na eerste login |

## Canvas (Konva)

- **Coördinatensysteem:** Centimeters. Scale-factor berekend o.b.v. viewport.
- **Interactie:** Drag & drop (planten vanuit sidebar), pan (scroll), zoom (ctrl+scroll/pinch)
- **Transformer:** Resize + rotatie voor zones en structuren. Shift = snap naar 45 graden (met positiecorrectie).
- **Fruitbomen:** Zones met `isFruitTree()` check worden als cirkel gerenderd met 1 plant in het midden (vergelijkbaar met Boom-structuur).
- **Tuinvorm:** Polygoon met versleepbare hoekpunten. Punten toevoegen (klik middenpunt segment) en verwijderen (dubbelklik).

## Planning module

De planning module biedt:

- **Zaai- & oogstkalender:** 12-maanden grid per gewas, regio-gecorrigeerd
- **Onderhoudstaken:** Per gewastype (12 types), met checkboxes en frequentie
- **Ziekte/plaag-waarschuwingen:** Per seizoen en gewastype
- **Gewasrotatie:** Multi-jaar archief, botanische families, rotatiejaren
- **Regio-instellingen:** 37 KNMI-weerstations, postcode-lookup, vorstdata
- **Zone status:** Lifecycle tracking (gepland → gezaaid → groeit → oogst → klaar)
- **Ontdek-modus:** Alle 86+ gewassen doorzoekbaar als kalender

### Data bestanden

| Bestand | Inhoud |
|---------|--------|
| `src/data/plant-families.json` | 11 botanische families met rotatiejaren |
| `src/data/maintenance-tasks.json` | Onderhoudstaken per plant type (12 types) |
| `src/data/knmi-stations.json` | 37 KNMI-stations + postcode mapping |

### Planning helpers (`src/lib/planning/`)

| Module | Functie |
|--------|---------|
| `families.ts` | Plantfamilie lookup, rotatiecheck |
| `tasks.ts` | Onderhoudstaken per plant, watergift |
| `frost.ts` | KNMI-station lookup, vorstdatum, zaaimaand-correctie |
| `calendar.ts` | Maandelijkse takenberekening, kalender entries |
| `rotation.ts` | Gewasrotatie conflictdetectie, positiegeschiedenis |

## Geplande architectuurwijzigingen

1. **Undo/redo:** Actiegeschiedenis voor canvas operaties
2. **PDF export:** Tuinplan als PDF genereren
3. **Dark mode:** Donker thema
4. **Push notificaties:** Browser notificaties voor taken

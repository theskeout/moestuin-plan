# Moestuin Planner — Claude Code Instructies

## Project

Interactieve moestuinplanner waarmee gebruikers hun tuin visueel kunnen ontwerpen. Gebouwd met Next.js 14, React 18, TypeScript, Tailwind CSS en Konva.js (canvas).

## Stack

- **Framework:** Next.js 14 (App Router)
- **UI:** Tailwind CSS + shadcn/ui (Radix primitives)
- **Canvas:** Konva.js + react-konva
- **Data:** localStorage (migratie naar Supabase gepland)
- **Hosting:** Vercel
- **Taal:** TypeScript strict

## Conventies

- **Taal in code:** Engels (variabelen, functies, types)
- **Taal in UI:** Nederlands (labels, teksten, placeholders)
- **Commits:** Nederlands, kort, beschrijvend
- **Components:** functioneel, hooks-based, "use client" waar nodig
- **Styling:** Tailwind utility classes, geen CSS modules
- **State:** useCallback/useMemo voor performance, custom hooks in `src/lib/hooks/`

## Structuur

```
src/
  app/              → Pages (App Router)
  components/
    ui/             → shadcn/ui basiscomponenten
    canvas/         → Konva canvas componenten
    sidebar/        → Sidebar UI (picker, info, alerts)
    setup/          → Setup wizard
  lib/
    plants/         → Plant types, catalogus, companions
    garden/         → Garden types, storage, helpers
    hooks/          → Custom React hooks
  data/
    plants.json     → Plant catalogus (86+ gewassen)
```

## Belangrijke patronen

- **Plant overrides:** Built-in planten kunnen door gebruiker aangepast worden via `savePlantOverride()`. Origineel blijft intact in `plants.json`, override in localStorage (`moestuin-plant-overrides`).
- **Garden shape:** Polygoon-based (`corners: Point[]`). Punten toevoegen/verwijderen voor complexe vormen (L-vorm etc).
- **Transformer:** Konva Transformer met Shift-snap naar 45 graden.
- **Auto-save:** Via `useAutoSave` hook, slaat op naar localStorage.

## Commando's

```bash
npm run dev       # Development server (localhost:3000)
npm run build     # Production build
npm run lint      # ESLint
```

## Geplande migratie

localStorage → Supabase (PostgreSQL) met gebruikersaccounts. Zie TODO.md voor details.

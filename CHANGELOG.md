# Changelog — Moestuin Planner

## 2026-02-14 (nacht)

### Canvas zoeken & fruitbomen
- Zoekbalk in linker sidebar om geplaatste gewassen op canvas te vinden en selecteren
- Fruitbomen (appelboom, perenboom, kersenboom, pruimenboom, vijgenboom, vijg, kiwi) verschijnen als 1 plant in rond vak (net als Boom-structuur)
- Verfijning placeholder verbeterd: "Type [plantnaam]"
- Shift-rotatie fix: positiecorrectie zodat element niet meer wegschuift bij 45-graden snap

## 2026-02-14 (avond)

### Supabase database & accounts
- Supabase Auth: registreren/inloggen met email en wachtwoord
- Storage abstractie: localStorage (gast) en Supabase (ingelogd) achter dezelfde interface
- Gastmodus: tuinen maken/bewerken werkt zonder account (localStorage)
- Ingelogde gebruikers: data opgeslagen in Supabase (gardens, custom_plants, plant_overrides)
- Gewassen bewerken/toevoegen alleen zichtbaar als ingelogd
- Auto-save werkt naar Supabase met localStorage als fallback
- Migratie-dialog: lokale data importeren naar account na eerste login
- UserMenu in header (inloggen/uitloggen + email)
- Login pagina met toggle registreren/inloggen

## 2026-02-14

### Tuinformaat, gewassen kopje, fruitbomen
- Header: naam en afmetingen bewerkbaar via potloodicoon
- Afmetingen aanpassen zonder hoeken te resetten
- "Gewassen" kopje in rechter sidebar (standaard open)
- 5 fruitbomen toegevoegd: appelboom, perenboom, vijgenboom, kersenboom, pruimenboom

### UI polish
- Groente/Fruit/Kruiden/Sier tabs compacter (past in sidebar)
- Structuren-kop prominenter
- Hoekpunten toevoegen (klik middenpunt segment) en verwijderen (dubbelklik)
- Maakt L-vormige en complexe tuinvormen mogelijk

### UX-verbeteringen batch
- Plant override systeem: built-in planten bewerkbaar (localStorage)
- Gewas bewerken via Dialog modal i.p.v. inline formulier
- Edit-icoon bij alle planten (niet alleen custom)
- Shift+Rotate snapt naar 45 graden
- Rotatie-invoerveld in linker sidebar voor zones en structuren
- Tab-structuur in rechter sidebar ("Toevoegen")

## 2026-02-13

### Zoom, export, notities
- Zoom percentage invoerbaar
- Import/export JSON in header
- Notities en verfijning (soort) per zone
- Catalogus uitgebreid naar 81 gewassen

### Gewassen bewerken
- Potloodicoon om custom gewassen te bewerken
- Meer icoonkeuze bij gewas toevoegen (47 iconen, gegroepeerd)

### Toolbar & layout
- Toolbar verplaatst naar linkerkolom
- Zoom centreert op viewport midden
- Interactieve scrollbars (klikbaar en sleepbaar)
- Boom-structuur als cirkel

### Linkerkolom selectie-info
- Geselecteerd element details in linker sidebar
- Breedte/hoogte invoer, lock/unlock, companion alerts
- Uitgebreid gewas-toevoegen formulier (zaaitijd, zon, water, buren)

### Centrering & schaal
- Tuin gecentreerd bij laden
- Scrollbars bij ingezoomd
- Zoom range uitgebreid (0.1x - 15x)
- Labels buiten kleine bedden
- Sidebar breedte aangepast

## 2026-02-12

### Eigen gewassen & structuren
- Inklapbare structuren-sectie
- Sier-categorie toegevoegd
- Eigen gewassen toevoegen (custom plants)
- Boom als structuurtype

### Selectie & interactie
- Deselectie bij klik op lege ruimte
- Lock-functie voor gewaszones
- Robuuster opslaan

### Auto-selectie & verwijderen
- Auto-selectie na plaatsing van zone/structuur
- Planten visualisatie als kruisjes in vak
- Lock-functie, hek-structuur

### Transformer & styling
- Transformer met rotatie voor zones en structuren
- Subtielere styling
- Delete en lock via sidebar

## 2026-02-11

### Eerste versie
- Rechthoekige gewaszones, structuren, cm-invoer
- Scroll = pan, ctrl+scroll = zoom
- Basis tuinplanner met drag & drop

### Initial commit
- Next.js project setup

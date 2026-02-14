# TODO — Moestuin Planner

## Actief / Korte termijn

### UX fixes
- [ ] Tuin verwijderen: bevestigingsdialoog (gaat nu te makkelijk per ongeluk)
- [ ] Geplant-datum per zone (voor reminders en oogst-notificaties)
- [ ] Compostbak als structuurtype toevoegen
- [ ] Copy-paste functie voor zones en structuren op canvas

### Database & Accounts
- [x] Supabase project opzetten
- [x] Database schema ontwerpen (gardens, plants, users)
- [x] Supabase Auth integreren (email/wachtwoord)
- [x] Storage migratie: localStorage → Supabase
- [x] Login/registratie pagina
- [x] Tuinen koppelen aan gebruikersaccount
- [x] Meerdere tuinen per gebruiker
- [x] Custom planten en overrides per gebruiker opslaan in DB
- [ ] Supabase "Confirm email" weer aanzetten voor productie

---

## Gepland / Middellange termijn

### Planner (zaai- & oogstkalender)
- [ ] Nieuwe tab "Planning" in rechter sidebar
- [ ] Kalenderweergave: zaai-binnen, zaai-buiten, oogst per gewas
- [ ] Overzicht per maand: wat moet er nu gebeuren?
- [ ] Notificaties / reminders (snoeien fruitbomen, zaaien, etc.)
- [ ] Vriesdata / regio-instelling voor zaaitijden
- [ ] Gewasrotatie: bijhouden wat waar stond vorige jaren

### Onderhoud & reminders
- [ ] Onderhoudstaken per gewas (snoeien, bemesten, etc.)
- [ ] Periodieke reminders (bijv. fruitbomen snoeien in feb)
- [ ] Watergift-schema suggesties

---

## Ideeën / Lange termijn

### Delen & samenwerken
- [ ] Tuin delen: uitnodigingen per email zodat familieleden kunnen meebeheren
- [ ] Supabase RLS policies voor gedeelde tuinen, invite tabel
- [ ] Tuin delen via link (read-only)
- [ ] PDF export van tuinontwerp
- [ ] Print-vriendelijke weergave

### UX verbeteringen
- [ ] Undo/redo
- [ ] Snap-to-grid bij plaatsing
- [ ] Mobiele weergave / responsive canvas
- [ ] Dark mode

### Data & integratie
- [ ] Weer-integratie (lokale temperatuur, vorst)
- [ ] Meer gewassen in catalogus
- [ ] Community-gewassen (gedeelde custom planten)
- [ ] Foto's bij zones/gewassen

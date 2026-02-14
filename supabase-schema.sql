-- Moestuin Planner — Supabase Database Schema
-- Voer dit uit in de Supabase SQL Editor

-- Gardens tabel
create table gardens (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  width_cm integer not null,
  height_cm integer not null,
  shape jsonb not null default '{}',
  zones jsonb not null default '[]',
  structures jsonb not null default '[]',
  plants jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table gardens enable row level security;

create policy "Gebruikers zien eigen tuinen"
  on gardens for select using (auth.uid() = user_id);
create policy "Gebruikers maken eigen tuinen"
  on gardens for insert with check (auth.uid() = user_id);
create policy "Gebruikers wijzigen eigen tuinen"
  on gardens for update using (auth.uid() = user_id);
create policy "Gebruikers verwijderen eigen tuinen"
  on gardens for delete using (auth.uid() = user_id);

-- Custom plants tabel
create table custom_plants (
  id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null,
  primary key (id, user_id)
);

alter table custom_plants enable row level security;

create policy "Gebruikers zien eigen custom plants"
  on custom_plants for select using (auth.uid() = user_id);
create policy "Gebruikers maken eigen custom plants"
  on custom_plants for insert with check (auth.uid() = user_id);
create policy "Gebruikers wijzigen eigen custom plants"
  on custom_plants for update using (auth.uid() = user_id);
create policy "Gebruikers verwijderen eigen custom plants"
  on custom_plants for delete using (auth.uid() = user_id);

-- Plant overrides tabel
create table plant_overrides (
  plant_id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null,
  primary key (plant_id, user_id)
);

alter table plant_overrides enable row level security;

create policy "Gebruikers zien eigen plant overrides"
  on plant_overrides for select using (auth.uid() = user_id);
create policy "Gebruikers maken eigen plant overrides"
  on plant_overrides for insert with check (auth.uid() = user_id);
create policy "Gebruikers wijzigen eigen plant overrides"
  on plant_overrides for update using (auth.uid() = user_id);
create policy "Gebruikers verwijderen eigen plant overrides"
  on plant_overrides for delete using (auth.uid() = user_id);

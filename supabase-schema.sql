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

-- Leden (owner/member) zien gedeelde tuinen (my_garden_ids = security definer)
create policy "Leden zien tuinen"
  on gardens for select using (id in (select my_garden_ids()));
-- Nieuwe tuinen: maker is eigenaar
create policy "Gebruikers maken eigen tuinen"
  on gardens for insert with check (auth.uid() = user_id);
-- Alle leden kunnen tuin bewerken
create policy "Leden wijzigen tuinen"
  on gardens for update using (id in (select my_garden_ids()));
-- Alleen eigenaar kan tuin verwijderen
create policy "Eigenaar verwijdert tuinen"
  on gardens for delete using (id in (select my_owned_garden_ids()));

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

-- ============================================================
-- Multi-user samenwerking
-- ============================================================

-- Helperfuncties (security definer) om circulaire RLS te voorkomen
create or replace function my_garden_ids()
returns setof text language sql security definer stable as $$
  select garden_id from garden_members where user_id = auth.uid();
$$;

create or replace function my_owned_garden_ids()
returns setof text language sql security definer stable as $$
  select garden_id from garden_members where user_id = auth.uid() and role = 'owner';
$$;

-- Garden members — koppelt users aan tuinen met rol
create table garden_members (
  id uuid primary key default gen_random_uuid(),
  garden_id text references gardens(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (garden_id, user_id)
);

alter table garden_members enable row level security;

create policy "Leden zien tuinleden"
  on garden_members for select using (garden_id in (select my_garden_ids()));
create policy "Eigenaar voegt leden toe"
  on garden_members for insert with check (garden_id in (select my_owned_garden_ids()));
create policy "Eigenaar of zelf verwijdert lid"
  on garden_members for delete using (
    user_id = auth.uid() or garden_id in (select my_owned_garden_ids())
  );
create policy "Eigenaar wijzigt leden"
  on garden_members for update using (garden_id in (select my_owned_garden_ids()));

-- Garden invites — uitnodigingen via deelbare link
create table garden_invites (
  id uuid primary key default gen_random_uuid(),
  garden_id text references gardens(id) on delete cascade not null,
  email text not null,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  invited_by uuid references auth.users(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (garden_id, email)
);

alter table garden_invites enable row level security;

create policy "Leden of genodigde zien uitnodigingen"
  on garden_invites for select using (
    email = (auth.jwt() ->> 'email')
    or garden_id in (select my_garden_ids())
  );
create policy "Eigenaar maakt uitnodigingen"
  on garden_invites for insert with check (garden_id in (select my_owned_garden_ids()));
create policy "Genodigde accepteert uitnodiging"
  on garden_invites for update using (
    email = (auth.jwt() ->> 'email')
  );
create policy "Eigenaar of uitnodiger verwijdert uitnodiging"
  on garden_invites for delete using (
    invited_by = auth.uid() or garden_id in (select my_owned_garden_ids())
  );

-- Trigger: automatisch owner-rij bij nieuwe tuin
create or replace function auto_create_garden_member()
returns trigger language plpgsql security definer as $$
begin
  insert into garden_members (garden_id, user_id, role)
  values (NEW.id, NEW.user_id, 'owner');
  return NEW;
end;
$$;

create trigger on_garden_created
  after insert on gardens for each row execute function auto_create_garden_member();

-- Functie: accepteer uitnodiging via token
create or replace function accept_invite(p_token text)
returns text language plpgsql security definer as $$
declare
  v_invite record;
begin
  select * into v_invite from garden_invites where token = p_token and status = 'pending';
  if not found then
    raise exception 'Uitnodiging niet gevonden of al geaccepteerd';
  end if;
  if v_invite.email != (select email from auth.users where id = auth.uid()) then
    raise exception 'Deze uitnodiging is niet voor jou';
  end if;
  insert into garden_members (garden_id, user_id, role)
  values (v_invite.garden_id, auth.uid(), 'member')
  on conflict (garden_id, user_id) do nothing;
  update garden_invites set status = 'accepted' where id = v_invite.id;
  return v_invite.garden_id;
end;
$$;

-- Functie: eigendom overdragen
create or replace function transfer_garden_ownership(p_garden_id text, p_new_owner_id uuid)
returns void language plpgsql security definer as $$
begin
  if not exists (select 1 from garden_members where garden_id = p_garden_id and user_id = auth.uid() and role = 'owner') then
    raise exception 'Alleen de eigenaar kan eigendom overdragen';
  end if;
  if not exists (select 1 from garden_members where garden_id = p_garden_id and user_id = p_new_owner_id) then
    raise exception 'Nieuwe eigenaar moet een lid zijn';
  end if;
  update garden_members set role = 'member' where garden_id = p_garden_id and user_id = auth.uid();
  update garden_members set role = 'owner' where garden_id = p_garden_id and user_id = p_new_owner_id;
  update gardens set user_id = p_new_owner_id where id = p_garden_id;
end;
$$;

-- Migratie: bestaande tuinen krijgen owner-rij
insert into garden_members (garden_id, user_id, role)
select id, user_id, 'owner' from gardens
where id not in (select garden_id from garden_members);

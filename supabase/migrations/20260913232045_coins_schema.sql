-- Caché del catálogo de Numista -------------------------------------------

create table coins_types (
  numista_id        integer primary key,
  title             text not null,
  issuer_code       text,
  issuer_name       text,
  min_year          integer,
  max_year          integer,
  composition_text  text,
  shape             text,
  weight            numeric,
  size              numeric,
  thickness         numeric,
  obverse_thumbnail text,
  obverse_picture   text,
  reverse_thumbnail text,
  reverse_picture   text,
  km_number         text,
  raw               jsonb not null,
  fetched_at        timestamptz not null default now()
);

create index coins_types_km_number_idx on coins_types (km_number);
create index coins_types_issuer_code_idx on coins_types (issuer_code);

create table coins_issues (
  numista_issue_id integer primary key,
  numista_id       integer not null references coins_types (numista_id) on delete cascade,
  year             integer,
  gregorian_year   integer,
  mint_letter      text,
  mintage          bigint,
  comment          text,
  km_number        text,
  raw              jsonb not null,
  fetched_at       timestamptz not null default now()
);

create index coins_issues_numista_id_idx on coins_issues (numista_id);

-- Datos propios de la colección -------------------------------------------

create table coins_items (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users (id) on delete cascade,
  numista_id       integer not null references coins_types (numista_id),
  numista_issue_id integer references coins_issues (numista_issue_id),
  grade            text check (grade in ('g','vg','f','vf','xf','au','unc')),
  condition_notes  text,
  location         text,   -- privado: nunca se expone públicamente
  notes            text,   -- privado: nunca se expone públicamente
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index coins_items_owner_idx on coins_items (owner_id);
create index coins_items_numista_id_idx on coins_items (numista_id);

create table coins_photos (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references coins_items (id) on delete cascade,
  side         text not null check (side in ('obverse','reverse','detail')),
  storage_path text not null,
  sort_order   integer not null default 0
);

create index coins_photos_item_idx on coins_photos (item_id);

-- Histórico de valoración: append-only, nunca se actualiza ----------------

create table coins_prices (
  id               uuid primary key default gen_random_uuid(),
  numista_issue_id integer not null references coins_issues (numista_issue_id) on delete cascade,
  grade            text not null,
  currency         text not null,
  price            numeric not null,
  fetched_at       timestamptz not null default now()
);

create index coins_prices_issue_idx on coins_prices (numista_issue_id, fetched_at desc);

-- Mapeo emisor -> continente ----------------------------------------------
-- Necesario porque GET /issuers de Numista no expone continente ni región.

create table coins_regions (
  issuer_code text primary key,
  issuer_name text not null,
  continent   text
);

-- Row Level Security -------------------------------------------------------

alter table coins_types   enable row level security;
alter table coins_issues  enable row level security;
alter table coins_items   enable row level security;
alter table coins_photos  enable row level security;
alter table coins_prices  enable row level security;
alter table coins_regions enable row level security;

-- El caché del catálogo es legible por cualquier usuario autenticado.
create policy "catálogo legible por autenticados" on coins_types
  for select to authenticated using (true);
create policy "emisiones legibles por autenticados" on coins_issues
  for select to authenticated using (true);
create policy "regiones legibles por autenticados" on coins_regions
  for select to authenticated using (true);
create policy "regiones editables por autenticados" on coins_regions
  for all to authenticated using (true) with check (true);

-- Los ejemplares son de su dueño, en lectura y escritura.
create policy "ejemplares propios" on coins_items
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "fotos de ejemplares propios" on coins_photos
  for all to authenticated
  using (exists (
    select 1 from coins_items i
    where i.id = coins_photos.item_id and i.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from coins_items i
    where i.id = coins_photos.item_id and i.owner_id = auth.uid()
  ));

create policy "precios legibles por autenticados" on coins_prices
  for select to authenticated using (true);
create policy "precios insertables por autenticados" on coins_prices
  for insert to authenticated with check (true);

-- El rol anónimo no tiene política alguna sobre estas tablas: no lee nada.

-- Vista pública ------------------------------------------------------------
-- La garantía de privacidad vive aquí, no en el frontend: las columnas
-- location, notes y cualquier precio simplemente no existen en esta vista.

create view coins_public_items
with (security_invoker = off) as
select
  i.id,
  i.grade,
  i.condition_notes,
  i.created_at,
  t.numista_id,
  t.title,
  t.issuer_code,
  t.issuer_name,
  t.km_number      as type_km_number,
  t.composition_text,
  t.weight,
  t.size,
  t.obverse_thumbnail,
  t.reverse_thumbnail,
  s.numista_issue_id,
  s.year           as issue_year,
  s.mint_letter,
  s.km_number      as issue_km_number,
  r.continent
from coins_items i
join coins_types t on t.numista_id = i.numista_id
left join coins_issues s on s.numista_issue_id = i.numista_issue_id
left join coins_regions r on r.issuer_code = t.issuer_code;

grant select on coins_public_items to anon, authenticated;

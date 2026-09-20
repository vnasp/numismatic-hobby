-- Metas de colección --------------------------------------------------------
--
-- Una meta es un recorte del catálogo que alguien se propone completar:
-- "todos los KM chilenos de circulación desde 1900". No guarda qué monedas
-- se tienen —eso ya está en coins_items— sino cuáles *existen*, que es lo
-- que Numista sabe y la colección no.
--
-- Vive en su propia tabla y no como una consulta sobre coins_types porque
-- el universo de una meta no se puede derivar de lo que hay en caché: la
-- caché sólo tiene los tipos que alguna vez se miraron, y la gracia de la
-- meta es justamente listar los que faltan.

create table coins_metas (
  slug           text primary key,
  name           text not null,
  -- Los parámetros con que se consultó a Numista, para poder repetir la
  -- importación más adelante sin volver a razonarlos.
  issuer_code    text not null,
  catalogue_code text not null default 'KM',
  from_year      integer,
  to_year        integer,
  -- Qué tipos de objeto cuentan para el avance. Los demás se importan
  -- igual —el listado es barato— pero quedan fuera del denominador, para
  -- poder ampliar la meta sin volver a consultar la API.
  counted_object_types text[] not null default '{}',
  created_at     timestamptz not null default now(),
  -- Cuándo se trajo por última vez el listado desde Numista.
  listed_at      timestamptz
);

-- Los tipos que componen una meta.
--
-- Sin clave foránea a coins_types a propósito: el listado (2 llamadas) se
-- importa entero antes que el detalle (una llamada por tipo), así que una
-- fila puede existir mucho antes de que su tipo esté en la caché. Es
-- justamente lo que permite saber cuántos faltan sin haberlos bajado.
create table coins_meta_types (
  meta_slug         text not null references coins_metas (slug) on delete cascade,
  numista_id        integer not null,
  title             text not null,
  object_type_id    text,
  object_type_name  text,
  min_year          integer,
  max_year          integer,
  obverse_thumbnail text,
  reverse_thumbnail text,
  primary key (meta_slug, numista_id)
);

create index coins_meta_types_numista_id_idx on coins_meta_types (numista_id);

alter table coins_metas      enable row level security;
alter table coins_meta_types enable row level security;

-- Las metas describen el catálogo, no a nadie: como coins_types, se leen
-- con sesión. Escribirlas es cosa de la Edge Function con la service-role
-- key, que evita RLS: así una importación no se dispara desde el cliente.
create policy "metas legibles por autenticados" on coins_metas
  for select to authenticated using (true);
create policy "tipos de la meta legibles por autenticados" on coins_meta_types
  for select to authenticated using (true);

-- El rol anónimo no tiene política: la vitrina no muestra metas.

-- La meta con la que nace la funcionalidad. Se inserta acá y no desde la
-- app porque sus parámetros son una decisión, no un dato que la usuaria
-- tipea: `chili` es el código de Chile en Numista, y el rango arranca en
-- 1900 porque el Real terminó en 1852 y el Peso del siglo XIX queda fuera
-- del nicho.
insert into coins_metas (slug, name, issuer_code, catalogue_code, from_year, to_year, counted_object_types)
values (
  'chile-1900',
  'Chile desde 1900',
  'chili',
  'KM',
  1900,
  null,
  array['Monedas circulantes normales']
);

-- Monedas sin valoración, para completar afuera ----------------------------
--
-- Exporta lo que hace falta para buscar el precio de cada ejemplar en
-- Numista: qué moneda es, de qué año y ceca, en qué estado está, y el enlace
-- directo a su ficha. Las tres últimas columnas van vacías: son las que se
-- completan.
--
-- Año y ceca salen de la emisión, no del tipo, porque Numista publica el
-- precio por año y ceca. Cuando el ejemplar se guardó sin emisión
-- determinada, el año cae al primero del tipo y la ceca queda vacía: ahí hay
-- que mirar la moneda para saber cuál es.
--
-- El `id` es la clave para volver a entrar: no se toca al llenar el archivo,
-- porque es lo único que une cada fila con su ejemplar.
--
-- El KM sale de `raw` y no de la columna `km_number`, porque esa columna sólo
-- guarda Krause y hay países (Venezuela) que Numista referencia sólo por Y#.
-- Se prefiere el número de la emisión al del tipo, que es más específico.
--
-- Desde psql, para dejar el archivo listo de una vez:
--
--   psql "$DATABASE_URL" --csv -f valoraciones-pendientes.sql -o valoraciones.csv
--
-- (`--csv -o` y no `\copy`, porque \copy exige la consulta en una sola línea.)
--
-- Desde el SQL Editor de Supabase basta con correrlo y usar "Download CSV".
--
-- Para revisar las que ya tienen valor, cambia el WHERE por
-- `where i.estimated_value is not null`.

-- Una misma moneda puede tener varias referencias del mismo catálogo: Krause
-- lista, por ejemplo, KM# 186.2 y 186.3 para el mismo tipo. Por eso se juntan
-- todas en una celda ("186.2, 186.3") en vez de esperar una sola: con
-- subconsulta escalar, Postgres falla con "more than one row returned".
with referencias as (
  select
    i.id,
    coalesce(
      (select string_agg(r->>'number', ', ' order by n)
         from jsonb_array_elements(s.raw->'references') with ordinality as x(r, n)
        where (r->'catalogue'->>'id')::int = 3),
      (select string_agg(r->>'number', ', ' order by n)
         from jsonb_array_elements(t.raw->'references') with ordinality as x(r, n)
        where (r->'catalogue'->>'id')::int = 3)
    ) as km,
    coalesce(
      (select string_agg(r->>'number', ', ' order by n)
         from jsonb_array_elements(s.raw->'references') with ordinality as x(r, n)
        where (r->'catalogue'->>'id')::int = 9),
      (select string_agg(r->>'number', ', ' order by n)
         from jsonb_array_elements(t.raw->'references') with ordinality as x(r, n)
        where (r->'catalogue'->>'id')::int = 9)
    ) as yeoman
  from coins_items i
  join coins_types t on t.numista_id = i.numista_id
  left join coins_issues s on s.numista_issue_id = i.numista_issue_id
)
select
  i.id,
  t.issuer_name                          as pais,
  t.title                                as titulo,
  coalesce(s.year, t.min_year)           as anio,
  -- La ceca va aparte del año: el precio de Numista es por año y ceca, no por
  -- tipo. Sin emisión determinada las dos quedan vacías.
  s.mint_letter                          as ceca,
  s.mintage                              as tirada,
  case
    when r.km is not null then 'KM# ' || r.km
    when r.yeoman is not null then 'Y# ' || r.yeoman
  end                                    as catalogo,
  case i.grade
    when 'g'   then 'G (Buena)'
    when 'vg'  then 'VG (Muy buena)'
    when 'f'   then 'F (Bien conservada)'
    when 'vf'  then 'VF (Muy bien conservada)'
    when 'xf'  then 'XF (Extraordinariamente bien conservada)'
    when 'au'  then 'AU (Casi sin circular)'
    when 'unc' then 'UNC (Sin circular)'
  end                                    as conservacion,
  t.composition_text                     as material,
  'https://es.numista.com/' || t.numista_id as numista_url,
  null::numeric                          as valor,
  null::text                             as moneda,
  null::text                             as fuente
from coins_items i
join coins_types t on t.numista_id = i.numista_id
left join coins_issues s on s.numista_issue_id = i.numista_issue_id
join referencias r on r.id = i.id
where i.estimated_value is null
order by t.issuer_name, coalesce(s.year, t.min_year), t.title;

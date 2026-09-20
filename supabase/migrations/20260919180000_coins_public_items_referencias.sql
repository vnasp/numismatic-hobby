-- La vista pública, al día con lo que muestra la colección ------------------
--
-- `coins_public_items` se creó antes que el Y# y que el año gregoriano, así
-- que a la vitrina pública le faltaban dos cosas:
--
--   * Las monedas referenciadas sólo por Yeoman (Venezuela, Japón, Rusia)
--     aparecían sin número, porque `km_number` sólo guarda Krause. Las
--     referencias completas viven en `raw`.
--   * El año gregoriano, sin el cual una moneda israelí fechada 5745 se
--     ordena y se agrupa como si fuera del año 5745.
--
-- Las columnas nuevas van al final para que `create or replace` acepte el
-- cambio: Postgres exige conservar nombre, tipo y orden de las que ya había.
--
-- Lo que esta vista NO expone sigue siendo la garantía de privacidad, y ahora
-- son cuatro columnas más: `location`, `notes`, `estimated_value`,
-- `value_currency`, `value_source` y `valued_at` no existen aquí. Quien entre
-- con el rol anónimo no puede leerlas ni consultando la API directamente.

create or replace view coins_public_items
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
  r.continent,
  -- Desde aquí, lo que se agrega.
  s.gregorian_year as issue_gregorian_year,
  t.raw->'references' as type_refs,
  s.raw->'references' as issue_refs
from coins_items i
join coins_types t on t.numista_id = i.numista_id
left join coins_issues s on s.numista_issue_id = i.numista_issue_id
left join coins_regions r on r.issuer_code = t.issuer_code;

grant select on coins_public_items to anon, authenticated;

-- Para comprobar que la valoración no se escapa: debe devolver 0 filas.
select column_name
from information_schema.columns
where table_name = 'coins_public_items'
  and column_name in ('location', 'notes', 'estimated_value', 'value_currency',
                      'value_source', 'valued_at');

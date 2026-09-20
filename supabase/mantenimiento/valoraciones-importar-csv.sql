-- Importar las valoraciones desde el CSV completado afuera ------------------
--
-- Alternativa a valoraciones-importar.sql, que es un UPDATE que se pega en el
-- SQL Editor. Este lee el CSV tal cual, sin tener que convertirlo: conviene
-- cuando son muchas filas, pero pide psql y el connection string.
--
-- SE EJECUTA DESDE psql, porque usa \copy para leer el archivo local:
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f valoraciones-importar-csv.sql
--
-- Espera un CSV llamado `valoraciones.csv` en el mismo directorio, con las
-- columnas que exportó valoraciones-pendientes.sql. De ellas sólo se usan
-- cuatro: `id`, `valor`, `moneda` y `fuente`. Las demás viajan para que quien
-- complete el archivo sepa de qué moneda se trata.
--
-- Se puede correr las veces que haga falta: cada fila pisa la valoración
-- anterior de ese ejemplar. Las filas con `valor` vacío se ignoran, así que
-- un archivo a medio llenar no borra nada.
--
-- Todo va en una transacción: si algo falla, no queda a medias.

begin;

create temporary table valoraciones_csv (
  id           uuid,
  pais         text,
  titulo       text,
  anio         integer,
  ceca         text,
  tirada       bigint,
  catalogo     text,
  conservacion text,
  material     text,
  numista_url  text,
  valor        numeric,
  moneda       text,
  fuente       text
) on commit drop;

\copy valoraciones_csv from 'valoraciones.csv' with (format csv, header)

-- 1. Filas que no se van a poder aplicar. Debería devolver 0 filas.
--    Si aparece alguna, corrígela en el CSV antes de seguir:
--      * "id desconocido": el id no existe o se editó por error.
--      * "moneda inválida": sólo se aceptan CLP, USD y EUR.
--      * "valor negativo": la base lo rechaza.
select v.id,
       v.titulo,
       case
         when i.id is null then 'id desconocido'
         when v.moneda is not null
              and upper(trim(v.moneda)) not in ('CLP', 'USD', 'EUR') then 'moneda inválida'
         when v.valor < 0 then 'valor negativo'
       end as problema
from valoraciones_csv v
left join coins_items i on i.id = v.id
where v.valor is not null
  and (
    i.id is null
    or (v.moneda is not null and upper(trim(v.moneda)) not in ('CLP', 'USD', 'EUR'))
    or v.valor < 0
  );

-- 2. El cambio. Sólo las filas con valor, y sólo las que pasan la validación.
update coins_items i
set estimated_value = v.valor,
    value_currency  = coalesce(upper(trim(v.moneda)), 'CLP'),
    -- Si no se anotó de dónde salió, queda constancia de que vino del CSV.
    value_source    = coalesce(nullif(trim(v.fuente), ''), 'Importada desde CSV'),
    valued_at       = now()
from valoraciones_csv v
where v.id = i.id
  and v.valor is not null
  and v.valor >= 0
  and (v.moneda is null or upper(trim(v.moneda)) in ('CLP', 'USD', 'EUR'));

-- 3. Cómo quedó la colección.
select count(*)                                          as monedas,
       count(estimated_value)                            as valoradas,
       count(*) - count(estimated_value)                 as sin_valorar
from coins_items;

select value_currency                as moneda,
       count(*)                      as monedas,
       sum(estimated_value)          as total
from coins_items
where estimated_value is not null
group by value_currency
order by value_currency;

commit;

-- Importar las valoraciones completadas afuera ------------------------------
--
-- Se pega tal cual en el SQL Editor de Supabase: no necesita psql, ni el
-- connection string, ni subir ningún archivo.
--
-- Lo único que cambia es la lista de VALUES: una fila por moneda, con el `id`
-- tal como salió de valoraciones-pendientes.sql, el valor, la moneda (CLP,
-- USD o EUR) y de dónde salió el número. Quien complete la lista puede
-- generarla directamente en este formato.
--
-- Se puede correr las veces que haga falta: cada fila pisa la valoración
-- anterior de ese ejemplar, y las que no estén en la lista no se tocan.
--
-- Si son muchas filas y prefieres no convertir el CSV a mano, está
-- valoraciones-importar-csv.sql, que lee el archivo directo desde psql.

begin;

with nuevas (id, valor, moneda, fuente) as (
  values
    -- ('00000000-0000-0000-0000-000000000000'::uuid, 3500, 'CLP', 'Numista, 1981 So, XF'),
    -- ('11111111-1111-1111-1111-111111111111'::uuid, 12.5, 'EUR', 'Numista, VF'),
    (null::uuid, null::numeric, null::text, null::text)  -- borra esta línea
),
limpias as (
  select id,
         valor,
         coalesce(upper(trim(moneda)), 'CLP')                as moneda,
         coalesce(nullif(trim(fuente), ''), 'Importada')     as fuente
  from nuevas
  where id is not null
    and valor is not null
)

-- 1. El cambio. Devuelve una fila por moneda actualizada.
update coins_items i
set estimated_value = n.valor,
    value_currency  = n.moneda,
    value_source    = n.fuente,
    valued_at       = now()
from limpias n
where n.id = i.id
  and n.valor >= 0
  and n.moneda in ('CLP', 'USD', 'EUR')
returning i.id, i.estimated_value, i.value_currency;

-- 2. Cómo quedó la colección.
select count(*)                          as monedas,
       count(estimated_value)            as valoradas,
       count(*) - count(estimated_value) as sin_valorar
from coins_items;

select value_currency       as moneda,
       count(*)             as monedas,
       sum(estimated_value) as total
from coins_items
where estimated_value is not null
group by value_currency
order by value_currency;

commit;

-- Si alguna fila no aparece en el RETURNING, su id no existe (se editó por
-- error), la moneda no es CLP/USD/EUR, o el valor es negativo. Para verlas
-- antes de escribir, corre sólo la parte de arriba como select:
--
--   with nuevas (id, valor, moneda, fuente) as ( values ... )
--   select n.*, case when i.id is null then 'id desconocido' end as problema
--   from nuevas n left join coins_items i on i.id = n.id;

-- Favoritos de la colección ------------------------------------------------
--
-- La política "ejemplares propios" de coins_items es `for all` sobre
-- `owner_id = auth.uid()`, así que cubre el UPDATE de esta columna sin
-- necesidad de una política nueva.

alter table coins_items
  add column is_favorite boolean not null default false;

-- Índice parcial: sólo indexa las filas marcadas, que son una minoría, para
-- que listar los favoritos de una usuaria no recorra toda la colección.
create index coins_items_favorite_idx
  on coins_items (owner_id)
  where is_favorite;

-- `coins_public_items` selecciona columnas explícitas, así que el favorito
-- no queda expuesto en la vista pública: es un marcador personal.

-- Impide registrar dos veces el mismo ejemplar -------------------------------
--
-- "El mismo" es el mismo tipo del catálogo Y la misma emisión: un ½ Centésimo
-- de 1962 y uno de 1963 comparten el número KM pero son monedas distintas, así
-- que el tipo por sí solo no alcanza como clave.
--
-- `numista_issue_id` queda nulo cuando la emisión no se pudo identificar. En
-- Postgres dos NULL no se consideran iguales, de modo que un índice único
-- sobre la columna tal cual dejaría pasar infinitas filas "sin emisión" del
-- mismo tipo. Se normaliza con coalesce a -1, valor que no puede existir como
-- id real de Numista.
--
-- OJO: si la colección ya tuviera duplicados, la creación del índice falla.
-- La consulta para encontrarlos antes de aplicar esta migración:
--
--   select owner_id, numista_id, coalesce(numista_issue_id, -1), count(*)
--   from coins_items
--   group by 1, 2, 3
--   having count(*) > 1;

create unique index coins_items_sin_duplicados
  on coins_items (owner_id, numista_id, coalesce(numista_issue_id, -1));

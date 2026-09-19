-- Valoración propia de cada ejemplar ---------------------------------------
--
-- Numista publica precios estimados por grado, pero su API los expone sólo en
-- el plan de pago (100 € + IVA al año), que no se justifica para una
-- colección personal. Así que la valoración se anota a mano: la ficha de la
-- moneda trae el enlace a Numista para consultarla y un campo para guardarla.
--
-- Va en `coins_items` y no en el catálogo porque es propia del ejemplar: el
-- precio depende del estado de conservación de ESTA moneda, no del tipo.
--
-- `value_source` queda libre a propósito: sirve para anotar de dónde salió el
-- número ("Numista, XF, precio medio") cuando lo completa otra herramienta.

alter table coins_items
  add column estimated_value numeric check (estimated_value >= 0),
  add column value_currency  text check (value_currency in ('CLP', 'USD', 'EUR')),
  add column value_source    text,
  add column valued_at       timestamptz;

comment on column coins_items.estimated_value is
  'Valoración estimada del ejemplar, en la moneda de value_currency.';
comment on column coins_items.value_currency is
  'Moneda de estimated_value: CLP, USD o EUR.';
comment on column coins_items.value_source is
  'De dónde salió la valoración, en texto libre. Ej: "Numista, XF, precio medio".';
comment on column coins_items.valued_at is
  'Cuándo se anotó la valoración, para saber si está vieja.';

-- Las políticas RLS existentes ("ejemplares propios", for all) ya cubren estas
-- columnas: no hace falta nada más.

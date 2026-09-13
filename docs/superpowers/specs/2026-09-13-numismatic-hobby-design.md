# Numismatic Hobby — Diseño

Fecha: 2026-09-13
Estado: aprobado

## Propósito

PWA mobile-first para catalogar una colección personal de monedas (200+ piezas),
apoyada en el catálogo de Numista. La colección se consulta principalmente desde
el celular y es públicamente visible en modo solo lectura.

La usuaria identifica sus monedas por número KM (catálogo 3 en Numista).

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Datos previos | Ninguno. Se parte de cero, sin migración. |
| Persistencia | Supabase. Todas las tablas con prefijo `coins_`. |
| Acceso | Un solo usuario editor (Supabase Auth, magic link) + vista pública de solo lectura. |
| Offline | No. La app es online-siempre; la PWA solo aporta instalabilidad y caché de assets. |
| Stack | Vite + React + TypeScript. |
| Datos propios | Fotos propias, grado/estado, ubicación física y notas. **No** se registran precio pagado ni datos de compra. |
| Visibilidad | Toda la colección es pública. No hay toggle por moneda. |
| Campos privados | Ubicación física, notas y precios estimados nunca se exponen públicamente. |
| Idioma | UI en español; la API se consume con `lang=es`. |

## API de Numista — hechos verificados

Verificados contra `swagger.yaml` (OpenAPI 3.0, versión 3.36) en la raíz del repo.

- Base URL: `https://api.numista.com/v3`
- Autenticación: header `Numista-API-Key: <key>`
- `lang` (`en`|`es`|`fr`) disponible en todos los endpoints del catálogo.
- Todos los endpoints pueden devolver `429`: *"You sent too many simultaneous
  requests or you reached the limit of your monthly quota."* La cuota mensual es
  un recurso escaso y el diseño debe protegerla.

Endpoints usados:

- `GET /types?catalogue=3&number=<KM>` — búsqueda por KM. El parámetro `number`
  solo funciona acompañado de `catalogue`.
- `GET /types?issuer=<code>&q=<denominación>&year=<año>` — búsqueda por país,
  denominación y año. Al menos uno de `q`, `issuer`, `catalogue`, `date`, `year`
  debe estar presente.
- `GET /types/{type_id}` — ficha del tipo: título, emisor, `min_year`/`max_year`,
  composición, peso, tamaño, grosor, anverso/reverso (descripción, leyenda,
  imágenes), `references[]` (catálogos, incluido KM), cecas, tags.
- `GET /types/{type_id}/issues` — emisiones del tipo: `id`, `year`,
  `gregorian_year`, `mint_letter`, `mintage`, `references[]` propias y `comment`.
  **Una misma referencia KM puede desambiguarse a nivel de emisión** (el swagger
  ejemplifica `KM 360.1` Río de Janeiro vs `KM 360.2` Bahía).
- `GET /types/{type_id}/issues/{issue_id}/prices?currency=<ISO>` — precio
  estimado por grado. Devuelve `currency` y `prices[]` con `grade` y `price`.
  Los grados son `g, vg, f, vf, xf, au, unc`.
- `GET /issuers` — emisores: `code`, `name`, `flag`, `wikidata_id`, `parent`,
  `level` (1..5). **No expone continente ni región.**

No usados en la v1:

- `POST /search_by_image` — el swagger lo marca explícitamente como función de
  pago. Su precisión real es desconocida y no está verificada.
- `GET /types/{id}/sales_records`, endpoints de `/users` y OAuth.

Supuesto a confirmar con la key real: el swagger marca `search_by_image` como de
pago pero **no** marca `/prices`. Debe verificarse si `/prices` está disponible
en el plan contratado antes de depender de él.

## Arquitectura

Tres piezas:

1. **PWA** — Vite + React + TypeScript. SPA estática, mobile-first, instalable.
   El service worker cachea únicamente el shell de la aplicación (assets), nunca
   datos.
2. **Supabase** — Postgres para los datos, Auth para el único usuario editor,
   Storage para las fotos.
3. **Edge Function `numista-proxy`** — el único componente que conoce la API key
   de Numista. El cliente jamás la ve. Además implementa el caché.

### Por qué un proxy

La API key no puede viajar en el bundle del cliente: cualquiera podría extraerla
y consumir la cuota mensual. El proxy la mantiene del lado del servidor.

### Estrategia de caché

El proxy consulta primero Postgres. Si el dato existe, responde sin llamar a
Numista. Un KM ya consultado no vuelve a gastar cuota. Los tipos y emisiones del
catálogo son prácticamente inmutables, así que el caché no expira
automáticamente; `fetched_at` queda registrado y una recarga puede forzarse
explícitamente.

Los precios son la excepción: cambian con el tiempo y por eso se acumulan como
histórico (ver más abajo), nunca se sobrescriben.

## Modelo de datos

Todas las tablas llevan prefijo `coins_`.

### `coins_types` — caché del catálogo

Espejo de `GET /types/{id}`.

- `numista_id` (PK, integer)
- `title`, `issuer_code`, `issuer_name`
- `min_year`, `max_year`
- `composition_text`, `weight`, `size`, `thickness`, `shape`
- `obverse_thumbnail`, `obverse_picture`, `reverse_thumbnail`, `reverse_picture`
- `km_number` — referencia del catálogo 3, extraída de `references[]` para poder
  buscar e indexar por ella
- `raw` (JSONB) — respuesta completa, para no perder campos no modelados
- `fetched_at`

### `coins_issues` — caché de emisiones

Espejo de `GET /types/{id}/issues`.

- `numista_issue_id` (PK, integer)
- `numista_id` (FK → `coins_types`)
- `year`, `gregorian_year`, `mint_letter`, `mintage`, `comment`
- `km_number` — referencia KM propia de la emisión, que puede ser más específica
  que la del tipo
- `raw` (JSONB), `fetched_at`

### `coins_items` — los ejemplares de la colección

El corazón de la aplicación. Estos datos son de la usuaria y nunca se
sobrescriben con datos de Numista.

- `id` (PK, uuid)
- `numista_id` (FK → `coins_types`)
- `numista_issue_id` (FK → `coins_issues`, nullable — la emisión exacta puede no
  ser determinable; sin ella no hay precio estimado)
- `grade` — código de la escala de Numista (`g`|`vg`|`f`|`vf`|`xf`|`au`|`unc`),
  nullable
- `condition_notes` — defectos y observaciones sobre el estado
- `location` — álbum, cajón, cápsula. **Privado.**
- `notes` — texto libre. **Privado.**
- `created_at`, `updated_at`

Un mismo tipo puede tener varios ejemplares.

### `coins_photos` — fotos propias

- `id` (PK, uuid), `item_id` (FK → `coins_items`, on delete cascade)
- `side` — `obverse` | `reverse` | `detail`
- `storage_path`, `sort_order`

### `coins_prices` — histórico de valoración

Append-only. Cada consulta a `/prices` inserta filas nuevas; nunca se
actualizan ni se borran.

- `id` (PK, uuid)
- `numista_issue_id`, `grade`, `currency`, `price`
- `fetched_at`

Esto permite ver la evolución del valor estimado a lo largo de los años, no solo
el último dato conocido.

### `coins_regions` — mapeo emisor → continente

Necesaria porque `/issuers` no expone continente ni región.

- `issuer_code` (PK)
- `issuer_name`, `continent`

Se siembra una vez a partir de `GET /issuers`, y es editable por la usuaria. La
edición manual es indispensable para los casos que ninguna lista automática
resuelve bien: países desaparecidos, colonias, entidades históricas.

Un emisor sin fila en esta tabla se agrupa bajo "Sin clasificar", visible en la
interfaz, de modo que los huecos se detectan y corrigen en lugar de esconder
monedas.

## Escala de grados

Se almacena el código de Numista, porque es el único que permite cruzar con
`/prices`. La interfaz muestra el código junto a una etiqueta en español:

| Código | Etiqueta mostrada |
|---|---|
| `g` | G — Bien conservada (baja) |
| `vg` | VG — Bien conservada |
| `f` | F — Muy bien conservada (baja) |
| `vf` | VF — Muy bien conservada |
| `xf` | XF — Extraordinariamente bien conservada |
| `au` | AU — Casi sin circular |
| `unc` | UNC — Sin circular |

## Seguridad

RLS activo en todas las tablas.

- **Escritura**: exclusivamente el usuario autenticado propietario.
- **Lectura pública**: el rol anónimo **no** tiene acceso directo a ninguna
  tabla. Solo puede leer la vista `coins_public_items`.

### `coins_public_items`

Vista SQL que une `coins_items` con `coins_types`, `coins_issues`, `coins_photos`
y `coins_regions`, y que **no incluye las columnas `location`, `notes` ni dato
alguno de `coins_prices`**.

La garantía de privacidad vive en la base de datos, no en el frontend: aunque un
componente intentara mostrar la ubicación de una moneda en la vista pública, el
dato no existe en la respuesta. Es imposible filtrarlo por error desde la UI.

Las fotos en Storage se sirven desde un bucket público de solo lectura, ya que
toda la colección es visible.

## Pantallas

Navegación inferior de tres pestañas: **Colección · Añadir · Ajustes**.

### 1. Colección (inicio)

Navegación jerárquica **Continente → País → monedas**, con contador en cada nivel
(`Europa · 47`, `Chile · 23`). Con más de 200 piezas, esto hace la colección
recorrible en tres toques.

Sobre la jerarquía, un buscador global local (sobre la colección ya cargada, sin
llamar a Numista) que filtra por país, denominación, año y KM.

El listado de monedas de un país es un grid de tarjetas cuadradas con la foto
propia; si aún no hay foto propia, la miniatura de referencia de Numista, marcada
visualmente como tal.

### 2. Añadir moneda

Flujo por pasos:

1. **Buscar en Numista**, en dos modos:
   - **Por KM** (`catalogue=3&number=`) — la vía habitual.
   - **Por país + denominación + año** (`issuer` + `q` + `year`), todos
     opcionales y combinables — para cuando se tiene la moneda en la mano pero
     no el KM.
2. **Elegir tipo** — resultados con miniatura, título, país y rango de años.
3. **Elegir emisión** — año, ceca, tirada y su KM específico. Puede omitirse,
   con aviso explícito de que sin emisión no habrá precio estimado.
4. **Datos propios** — grado, ubicación, notas.
5. **Fotos** — anverso y reverso.

Al guardar: se persisten tipo y emisión en caché, se crea el ejemplar, se suben
las fotos y, si hay emisión, se consulta `/prices` y se inserta el primer punto
del histórico.

### 3. Detalle de moneda

Fotos propias arriba (carrusel anverso/reverso/detalles), luego los datos
propios (grado, ubicación, notas), luego la ficha de Numista (composición, peso,
diámetro, leyendas, tirada, cecas) con enlace al original, y finalmente la
valoración estimada para el grado registrado, con la fecha de actualización y un
botón explícito para refrescarla.

Acciones: editar, eliminar.

### 4. Vista pública

Ruta `/publica`. Misma navegación Continente → País, alimentada exclusivamente
por `coins_public_items`. Sin edición, sin ubicación, sin notas, sin precios.

### 5. Ajustes

Configuración del mapeo de continentes (`coins_regions`), incluida la lista de
emisores sin clasificar; recarga del caché de un tipo; información de uso de la
cuota de API.

## Fotos

Las monedas están montadas en cartones con ventana, así que el formato natural es
cuadrado.

Procesamiento en el cliente, antes de subir:

1. Recorte 1:1 con previsualización, permitiendo reencuadrar.
2. Redimensionado a 1200×1200 px máximo.
3. Conversión a WebP con compresión.

Una foto de cámara de ~4 MB llega a Storage pesando alrededor de 150 KB. Esto
importa: 200 monedas × 2 caras sin comprimir serían más de 1,5 GB.

## Manejo de errores

| Situación | Comportamiento |
|---|---|
| `429` cuota agotada | Mensaje explícito de cuota mensual agotada, distinguido de un error genérico. Los datos ya cacheados siguen funcionando. |
| KM sin resultados | Ofrecer la búsqueda por país + denominación + año como alternativa. |
| Falla la subida de una foto | El ejemplar ya está guardado. Se reintenta solo la foto, sin rehacer el formulario. |
| `/prices` no disponible en el plan | La app funciona igual; la sección de valoración se muestra como no disponible, no como error. |
| Sin conexión | Aviso claro de que la app requiere conexión. |

## Estructura del código

Organizada por feature, no por tipo de archivo:

```
src/
  features/
    collection/     navegación jerárquica, grid, buscador local
    add-coin/       flujo de búsqueda y alta
    coin-detail/    ficha, edición, precios
    public/         vista pública de solo lectura
    settings/       regiones, caché, cuota
  lib/
    numista/        cliente tipado (tipos derivados del swagger)
    supabase/       cliente, tipos generados, queries
    photos/         recorte, redimensionado, conversión WebP
  components/       primitivas de UI compartidas
supabase/
  migrations/       esquema, RLS, vista pública
  functions/
    numista-proxy/  Edge Function
```

Cada feature expone sus hooks y componentes; ninguna importa los internos de
otra.

## Testing

Vitest + Testing Library.

El cliente de Numista se testea contra fixtures extraídas del propio
`swagger.yaml`, de modo que los tests no consumen cuota ni dependen de la red.

Cobertura prioritaria: extracción del KM desde `references[]`, la lógica de
caché del proxy (acierto y fallo), el pipeline de procesamiento de fotos, y la
garantía de que `coins_public_items` no expone campos privados.

## Fuera de alcance de la v1

Decidido explícitamente, no por omisión:

- Búsqueda por imagen (`search_by_image`): función de pago, precisión no
  verificada.
- Registros de ventas (`sales_records`).
- Precio pagado y datos de compra.
- Importar la colección desde Numista vía OAuth.
- Edición sin conexión con cola de sincronización.
- Billetes y exonumia: solo monedas.

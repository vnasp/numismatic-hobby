# Fundación y catálogo — Plan de implementación (Plan 1 de 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poder buscar una moneda en Numista por su número KM y registrarla en la colección personal, con la API key protegida en el servidor y caché que preserva la cuota mensual.

**Architecture:** SPA en Vite + React + TypeScript que habla con Supabase. Una Edge Function (`numista-proxy`) es el único componente que conoce la API key de Numista; consulta primero el caché en Postgres y solo llama a la API externa cuando falta el dato. El código de dominio puro (tipos y extracción de referencias de catálogo) vive en `shared/` y lo importan tanto el frontend como la Edge Function.

**Tech Stack:** Vite 7, React 19, TypeScript, React Router 7, TanStack Query 5, Supabase (Postgres + Auth + Edge Functions en Deno), Vitest + Testing Library.

## Global Constraints

- Todas las tablas de Postgres llevan el prefijo `coins_`.
- La API key de Numista **nunca** aparece en código del frontend ni en variables `VITE_*`. Vive únicamente como secreto de la Edge Function.
- Base URL de Numista: `https://api.numista.com/v3`. Autenticación: header `Numista-API-Key`.
- Todas las llamadas al catálogo de Numista incluyen `lang=es`.
- El catálogo KM es `catalogue=3` en la API.
- La UI está en español.
- Diseño mobile-first: se desarrolla y verifica a 390 px de ancho primero.
- Los tests no llaman a la red ni consumen cuota de API: se usan fixtures derivadas de `swagger.yaml`.
- Escala de grados: `g`, `vg`, `f`, `vf`, `xf`, `au`, `unc`.

## Prerrequisitos externos

Estos dos elementos los debe proveer la usuaria antes de la Tarea 4. Las tareas 1 a 3 no los necesitan.

1. **API key de Numista** — se solicita en https://en.numista.com/api/ (requiere cuenta).
2. **Proyecto de Supabase** — crear en https://supabase.com, y anotar Project URL, `anon key` y Project Ref.

## Estructura de archivos

```
shared/numista/
  types.ts          Tipos TypeScript del catálogo (Type, Issue, SearchResult, Reference)
  references.ts     Extracción de números de catálogo desde references[]
  errors.ts         Clases de error del dominio (cuota, no encontrado, auth)
src/
  lib/
    numista/
      proxyClient.ts   Cliente del frontend: llama a la Edge Function, nunca a Numista
    supabase/
      client.ts        Instancia del cliente de Supabase
      types.ts         Tipos de las tablas coins_*
    grades.ts          Códigos de grado y sus etiquetas en español
  features/
    auth/              Login por magic link y guarda de rutas
    add-coin/          Búsqueda por KM, selección de tipo y emisión, alta
    collection/        Listado de la colección
  components/          Primitivas de UI compartidas
  App.tsx              Rutas
  main.tsx             Punto de entrada
supabase/
  migrations/          Esquema, RLS, vista pública
  functions/
    numista-proxy/
      index.ts         Handler HTTP
      numistaApi.ts    Llamadas a la API real de Numista
      cache.ts         Lectura y escritura del caché en Postgres
tests/fixtures/
  numista/             Respuestas de ejemplo extraídas del swagger
```

---

### Task 1: Andamiaje del proyecto

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/App.test.tsx`, `src/setupTests.ts`, `.gitignore`, `.env.example`

**Interfaces:**
- Consumes: nada.
- Produces: proyecto Vite ejecutable con `npm run dev`, y `npm test` funcionando con Vitest + Testing Library.

- [ ] **Step 1: Crear el proyecto Vite**

```bash
npm create vite@latest . -- --template react-ts
npm install
```

Si el directorio no está vacío, elegir la opción de continuar sin borrar archivos existentes (`swagger.yaml`, `docs/`, `README.md` deben conservarse).

- [ ] **Step 2: Instalar dependencias**

```bash
npm install react-router-dom @tanstack/react-query @supabase/supabase-js
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event vite-plugin-pwa
```

- [ ] **Step 3: Configurar Vitest y la PWA en `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Mi Colección de Monedas',
        short_name: 'Monedas',
        description: 'Catálogo personal de monedas',
        theme_color: '#1c1917',
        background_color: '#fafaf9',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
```

- [ ] **Step 4: Crear `src/setupTests.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5: Añadir el script de test en `package.json`**

En la sección `"scripts"`, añadir:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Escribir el test que falla**

Crear `src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import App from './App'

test('muestra el título de la aplicación', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /mi colección/i })).toBeInTheDocument()
})
```

- [ ] **Step 7: Ejecutar el test y verificar que falla**

Run: `npm test`
Expected: FAIL — el `App.tsx` generado por Vite no contiene ese encabezado.

- [ ] **Step 8: Reemplazar `src/App.tsx`**

```tsx
export default function App() {
  return (
    <main>
      <h1>Mi Colección de Monedas</h1>
    </main>
  )
}
```

Borrar `src/App.css` y la importación de `./App.css` si el andamiaje la dejó.

- [ ] **Step 9: Ejecutar el test y verificar que pasa**

Run: `npm test`
Expected: PASS

- [ ] **Step 10: Crear `.env.example`**

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

La API key de Numista **no** aparece aquí: es un secreto de la Edge Function, no del frontend.

- [ ] **Step 11: Verificar que `.gitignore` excluye `.env`**

Run: `grep -n "^\.env" .gitignore`
Expected: al menos una línea que cubra `.env` (el andamiaje de Vite incluye `*.local`; añadir `.env` si falta).

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: andamiaje Vite + React + TS con Vitest y PWA"
```

---

### Task 2: Tipos del catálogo y extracción de referencias

Los tipos de Numista traen un array `references[]` con todos los catálogos en los que aparece la moneda. Necesitamos extraer el número del catálogo KM (`catalogue.id === 3`), tanto para guardarlo indexado como para mostrarlo.

**Files:**
- Create: `shared/numista/types.ts`, `shared/numista/references.ts`, `shared/numista/references.test.ts`, `tests/fixtures/numista/type-420.json`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `interface NumistaReference { catalogue: { id: number; code: string }; number: string }`
  - `interface NumistaType` con al menos `id`, `title`, `issuer`, `min_year`, `max_year`, `composition`, `weight`, `size`, `obverse`, `reverse`, `references`
  - `interface NumistaIssue` con `id`, `year`, `gregorian_year`, `mint_letter`, `mintage`, `comment`, `references`
  - `KM_CATALOGUE_ID: 3`
  - `extractCatalogueNumber(references: NumistaReference[] | undefined, catalogueId: number): string | null`
  - `extractKmNumber(references: NumistaReference[] | undefined): string | null`

- [ ] **Step 1: Crear la fixture desde el swagger**

Crear `tests/fixtures/numista/type-420.json` con el ejemplo de `GET /types/{type_id}` del swagger (moneda canadiense de 5 centavos, N# 420), recortado a los campos que modelamos:

```json
{
  "id": 420,
  "url": "https://en.numista.com/420",
  "title": "5 Cents - Victoria",
  "issuer": { "code": "canada", "name": "Canada" },
  "min_year": 1858,
  "max_year": 1901,
  "shape": "Round",
  "composition": { "text": "Silver (.925) (.925 silver .075 copper)" },
  "obverse": {
    "description": "Head of the very young Queen Victoria wearing a laurel wreath, facing left.",
    "picture": "https://en.numista.com/catalogue/photos/canada/1009-original.jpg",
    "thumbnail": "https://en.numista.com/catalogue/photos/canada/1009-180.jpg"
  },
  "reverse": {
    "description": "The face value surrounded by two maple boughs and the crown of Queen Victoria",
    "picture": "https://en.numista.com/catalogue/photos/canada/1010-original.jpg",
    "thumbnail": "https://en.numista.com/catalogue/photos/canada/1010-180.jpg"
  },
  "references": [
    { "catalogue": { "id": 3, "code": "KM" }, "number": "2" },
    { "catalogue": { "id": 24, "code": "Schön" }, "number": "2" }
  ],
  "weight": 1.167,
  "size": 15.494,
  "thickness": 0.7,
  "category": "coin",
  "type": "Standard circulation coin"
}
```

- [ ] **Step 2: Escribir el test que falla**

Crear `shared/numista/references.test.ts`:

```ts
import { extractKmNumber, extractCatalogueNumber, KM_CATALOGUE_ID } from './references'
import type { NumistaReference } from './types'
import typeFixture from '../../tests/fixtures/numista/type-420.json'

describe('extractKmNumber', () => {
  test('extrae el número KM de una ficha real', () => {
    expect(extractKmNumber(typeFixture.references)).toBe('2')
  })

  test('devuelve null cuando la moneda no está en el catálogo KM', () => {
    const refs: NumistaReference[] = [
      { catalogue: { id: 24, code: 'Schön' }, number: '2' },
    ]
    expect(extractKmNumber(refs)).toBeNull()
  })

  test('devuelve null cuando no hay referencias', () => {
    expect(extractKmNumber(undefined)).toBeNull()
    expect(extractKmNumber([])).toBeNull()
  })

  test('conserva los números con subvariante como texto', () => {
    const refs: NumistaReference[] = [
      { catalogue: { id: KM_CATALOGUE_ID, code: 'KM' }, number: '360.1' },
    ]
    expect(extractKmNumber(refs)).toBe('360.1')
  })
})

describe('extractCatalogueNumber', () => {
  test('extrae el número de cualquier catálogo por id', () => {
    expect(extractCatalogueNumber(typeFixture.references, 24)).toBe('2')
  })
})
```

Nota sobre el último test de `extractKmNumber`: el número **debe** tratarse como texto, nunca como número. `360.10` y `360.1` son variantes distintas, y convertirlas a `number` las haría idénticas.

- [ ] **Step 3: Ejecutar el test y verificar que falla**

Run: `npx vitest run shared/numista/references.test.ts`
Expected: FAIL — no existe el módulo `./references`.

Si falla por no poder importar el JSON, añadir `"resolveJsonModule": true` en `tsconfig.json`.

- [ ] **Step 4: Escribir `shared/numista/types.ts`**

```ts
export interface NumistaReference {
  catalogue: { id: number; code: string }
  number: string
}

export interface NumistaSide {
  description?: string
  lettering?: string
  picture?: string
  thumbnail?: string
}

export interface NumistaType {
  id: number
  url?: string
  title: string
  issuer?: { code: string; name: string }
  min_year?: number
  max_year?: number
  shape?: string
  composition?: { text?: string }
  obverse?: NumistaSide
  reverse?: NumistaSide
  references?: NumistaReference[]
  weight?: number
  size?: number
  thickness?: number
  category?: string
  type?: string
}

export interface NumistaIssue {
  id: number
  is_dated?: boolean
  year?: number
  gregorian_year?: number
  mint_letter?: string
  mintage?: number
  comment?: string
  references?: NumistaReference[]
}

export interface NumistaSearchResult {
  count: number
  types: NumistaType[]
}
```

- [ ] **Step 5: Escribir `shared/numista/references.ts`**

```ts
import type { NumistaReference } from './types'

/** ID del catálogo Krause (KM) en Numista. */
export const KM_CATALOGUE_ID = 3

export function extractCatalogueNumber(
  references: NumistaReference[] | undefined,
  catalogueId: number,
): string | null {
  const match = references?.find((ref) => ref.catalogue?.id === catalogueId)
  return match?.number ?? null
}

export function extractKmNumber(
  references: NumistaReference[] | undefined,
): string | null {
  return extractCatalogueNumber(references, KM_CATALOGUE_ID)
}
```

- [ ] **Step 6: Ejecutar el test y verificar que pasa**

Run: `npx vitest run shared/numista/references.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 7: Commit**

```bash
git add shared/ tests/fixtures/ tsconfig.json
git commit -m "feat: tipos del catálogo Numista y extracción de referencias KM"
```

---

### Task 3: Errores de dominio y etiquetas de grado

**Files:**
- Create: `shared/numista/errors.ts`, `src/lib/grades.ts`, `src/lib/grades.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `class NumistaQuotaError extends Error` — corresponde al HTTP 429
  - `class NumistaNotFoundError extends Error` — HTTP 404
  - `class NumistaAuthError extends Error` — HTTP 401
  - `class NumistaError extends Error` — cualquier otro fallo
  - `type GradeCode = 'g' | 'vg' | 'f' | 'vf' | 'xf' | 'au' | 'unc'`
  - `GRADES: readonly { code: GradeCode; label: string }[]`
  - `gradeLabel(code: GradeCode): string`

- [ ] **Step 1: Escribir `shared/numista/errors.ts`**

```ts
export class NumistaError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
    this.name = 'NumistaError'
  }
}

/** HTTP 429: demasiadas peticiones simultáneas o cuota mensual agotada. */
export class NumistaQuotaError extends NumistaError {
  constructor() {
    super('Se agotó la cuota mensual de la API de Numista.', 429)
    this.name = 'NumistaQuotaError'
  }
}

export class NumistaNotFoundError extends NumistaError {
  constructor() {
    super('No se encontró en el catálogo de Numista.', 404)
    this.name = 'NumistaNotFoundError'
  }
}

export class NumistaAuthError extends NumistaError {
  constructor() {
    super('La API key de Numista es inválida o falta.', 401)
    this.name = 'NumistaAuthError'
  }
}
```

- [ ] **Step 2: Escribir el test que falla**

Crear `src/lib/grades.test.ts`:

```ts
import { GRADES, gradeLabel } from './grades'

test('cubre los siete grados de la escala de Numista', () => {
  expect(GRADES.map((g) => g.code)).toEqual(['g', 'vg', 'f', 'vf', 'xf', 'au', 'unc'])
})

test('devuelve la etiqueta en español de un grado', () => {
  expect(gradeLabel('xf')).toBe('XF — Extraordinariamente bien conservada')
  expect(gradeLabel('unc')).toBe('UNC — Sin circular')
})
```

- [ ] **Step 3: Ejecutar el test y verificar que falla**

Run: `npx vitest run src/lib/grades.test.ts`
Expected: FAIL — no existe el módulo `./grades`.

- [ ] **Step 4: Escribir `src/lib/grades.ts`**

Los códigos son los que devuelve `/prices` en la API; las etiquetas son la nomenclatura española equivalente.

```ts
export type GradeCode = 'g' | 'vg' | 'f' | 'vf' | 'xf' | 'au' | 'unc'

export const GRADES = [
  { code: 'g', label: 'G — Bien conservada (baja)' },
  { code: 'vg', label: 'VG — Bien conservada' },
  { code: 'f', label: 'F — Muy bien conservada (baja)' },
  { code: 'vf', label: 'VF — Muy bien conservada' },
  { code: 'xf', label: 'XF — Extraordinariamente bien conservada' },
  { code: 'au', label: 'AU — Casi sin circular' },
  { code: 'unc', label: 'UNC — Sin circular' },
] as const satisfies readonly { code: GradeCode; label: string }[]

export function gradeLabel(code: GradeCode): string {
  return GRADES.find((g) => g.code === code)?.label ?? code
}
```

- [ ] **Step 5: Ejecutar el test y verificar que pasa**

Run: `npx vitest run src/lib/grades.test.ts`
Expected: PASS — 2 tests.

- [ ] **Step 6: Commit**

```bash
git add shared/numista/errors.ts src/lib/grades.ts src/lib/grades.test.ts
git commit -m "feat: errores de dominio de Numista y escala de grados"
```

---

### Task 4: Esquema de base de datos y RLS

Requiere el proyecto de Supabase creado (ver Prerrequisitos externos).

**Files:**
- Create: `supabase/config.toml` (generado), `supabase/migrations/<timestamp>_coins_schema.sql`

**Interfaces:**
- Consumes: nada.
- Produces: tablas `coins_types`, `coins_issues`, `coins_items`, `coins_photos`, `coins_prices`, `coins_regions` y la vista `coins_public_items`.

- [ ] **Step 1: Inicializar Supabase y enlazar el proyecto**

```bash
supabase init
supabase link --project-ref <tu-project-ref>
```

- [ ] **Step 2: Crear la migración**

```bash
supabase migration new coins_schema
```

- [ ] **Step 3: Escribir el esquema en el archivo de migración creado**

```sql
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
```

- [ ] **Step 4: Aplicar la migración**

```bash
supabase db push
```

Expected: la migración se aplica sin errores.

- [ ] **Step 5: Verificar que el rol anónimo no puede leer los datos privados**

Con la URL y la `anon key` del proyecto:

```bash
curl -s "<SUPABASE_URL>/rest/v1/coins_items?select=location" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
```

Expected: un array vacío `[]` o un error de permisos — nunca datos. RLS sin política para `anon` no devuelve filas.

- [ ] **Step 6: Verificar que la vista pública no expone campos privados**

```bash
curl -s "<SUPABASE_URL>/rest/v1/coins_public_items?select=*&limit=1" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
```

Expected: responde `[]` (aún no hay datos) sin error de permisos. Cuando haya datos, ninguna clave `location` ni `notes` debe aparecer.

- [ ] **Step 7: Commit**

```bash
git add supabase/
git commit -m "feat: esquema coins_*, RLS y vista pública"
```

---

### Task 5: Edge Function numista-proxy

El único componente que conoce la API key. Consulta el caché en Postgres antes de llamar a Numista.

**Files:**
- Create: `supabase/functions/numista-proxy/index.ts`, `supabase/functions/numista-proxy/numistaApi.ts`, `supabase/functions/numista-proxy/cache.ts`

**Interfaces:**
- Consumes: `shared/numista/types.ts`, `shared/numista/references.ts`, `shared/numista/errors.ts`.
- Produces un endpoint HTTP con tres operaciones, todas vía POST con cuerpo JSON:
  - `{ "op": "searchByKm", "km": "360.1" }` → `NumistaSearchResult`
  - `{ "op": "search", "issuer"?: string, "q"?: string, "year"?: string }` → `NumistaSearchResult`
  - `{ "op": "getType", "typeId": 420 }` → `{ type: NumistaType; issues: NumistaIssue[] }`

- [ ] **Step 1: Escribir `supabase/functions/numista-proxy/numistaApi.ts`**

```ts
import type { NumistaType, NumistaIssue, NumistaSearchResult } from '../../../shared/numista/types.ts'
import {
  NumistaError,
  NumistaQuotaError,
  NumistaNotFoundError,
  NumistaAuthError,
} from '../../../shared/numista/errors.ts'

const BASE_URL = 'https://api.numista.com/v3'
const KM_CATALOGUE_ID = 3

function apiKey(): string {
  const key = Deno.env.get('NUMISTA_API_KEY')
  if (!key) throw new NumistaAuthError()
  return key
}

async function call<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(BASE_URL + path)
  url.searchParams.set('lang', 'es')
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, v)
  }

  const res = await fetch(url, { headers: { 'Numista-API-Key': apiKey() } })

  if (res.status === 429) throw new NumistaQuotaError()
  if (res.status === 404) throw new NumistaNotFoundError()
  if (res.status === 401) throw new NumistaAuthError()
  if (!res.ok) throw new NumistaError(`Numista respondió ${res.status}`, res.status)

  return await res.json() as T
}

export function searchByKm(km: string): Promise<NumistaSearchResult> {
  // El parámetro `number` sólo funciona acompañado de `catalogue`.
  return call('/types', { catalogue: String(KM_CATALOGUE_ID), number: km })
}

export function search(params: { issuer?: string; q?: string; year?: string }): Promise<NumistaSearchResult> {
  return call('/types', {
    issuer: params.issuer ?? '',
    q: params.q ?? '',
    year: params.year ?? '',
  })
}

export function getType(typeId: number): Promise<NumistaType> {
  return call(`/types/${typeId}`, {})
}

export function getIssues(typeId: number): Promise<NumistaIssue[]> {
  return call(`/types/${typeId}/issues`, {})
}
```

- [ ] **Step 2: Escribir `supabase/functions/numista-proxy/cache.ts`**

```ts
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import type { NumistaType, NumistaIssue } from '../../../shared/numista/types.ts'
import { extractKmNumber } from '../../../shared/numista/references.ts'

export async function readCachedType(
  db: SupabaseClient,
  typeId: number,
): Promise<{ type: NumistaType; issues: NumistaIssue[] } | null> {
  const { data: typeRow } = await db
    .from('coins_types')
    .select('raw')
    .eq('numista_id', typeId)
    .maybeSingle()

  if (!typeRow) return null

  const { data: issueRows } = await db
    .from('coins_issues')
    .select('raw')
    .eq('numista_id', typeId)

  return {
    type: typeRow.raw as NumistaType,
    issues: (issueRows ?? []).map((r) => r.raw as NumistaIssue),
  }
}

export async function writeCachedType(
  db: SupabaseClient,
  type: NumistaType,
  issues: NumistaIssue[],
): Promise<void> {
  await db.from('coins_types').upsert({
    numista_id: type.id,
    title: type.title,
    issuer_code: type.issuer?.code ?? null,
    issuer_name: type.issuer?.name ?? null,
    min_year: type.min_year ?? null,
    max_year: type.max_year ?? null,
    composition_text: type.composition?.text ?? null,
    shape: type.shape ?? null,
    weight: type.weight ?? null,
    size: type.size ?? null,
    thickness: type.thickness ?? null,
    obverse_thumbnail: type.obverse?.thumbnail ?? null,
    obverse_picture: type.obverse?.picture ?? null,
    reverse_thumbnail: type.reverse?.thumbnail ?? null,
    reverse_picture: type.reverse?.picture ?? null,
    km_number: extractKmNumber(type.references),
    raw: type,
    fetched_at: new Date().toISOString(),
  })

  if (issues.length === 0) return

  await db.from('coins_issues').upsert(
    issues.map((issue) => ({
      numista_issue_id: issue.id,
      numista_id: type.id,
      year: issue.year ?? null,
      gregorian_year: issue.gregorian_year ?? null,
      mint_letter: issue.mint_letter ?? null,
      mintage: issue.mintage ?? null,
      comment: issue.comment ?? null,
      km_number: extractKmNumber(issue.references),
      raw: issue,
      fetched_at: new Date().toISOString(),
    })),
  )
}
```

- [ ] **Step 3: Escribir `supabase/functions/numista-proxy/index.ts`**

```ts
import { createClient } from 'jsr:@supabase/supabase-js@2'
import * as api from './numistaApi.ts'
import { readCachedType, writeCachedType } from './cache.ts'
import { NumistaError } from '../../../shared/numista/errors.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'No autenticado' }, 401)

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // El usuario debe estar autenticado: el proxy no es un endpoint abierto,
  // porque cada llamada puede consumir cuota mensual de la API.
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'No autenticado' }, 401)

  try {
    const body = await req.json()

    switch (body.op) {
      case 'searchByKm':
        return json(await api.searchByKm(String(body.km)))

      case 'search':
        return json(await api.search({
          issuer: body.issuer,
          q: body.q,
          year: body.year,
        }))

      case 'getType': {
        const typeId = Number(body.typeId)
        const cached = await readCachedType(db, typeId)
        if (cached) return json({ ...cached, fromCache: true })

        const [type, issues] = await Promise.all([
          api.getType(typeId),
          api.getIssues(typeId),
        ])
        await writeCachedType(db, type, issues)
        return json({ type, issues, fromCache: false })
      }

      default:
        return json({ error: `Operación desconocida: ${body.op}` }, 400)
    }
  } catch (err) {
    if (err instanceof NumistaError) {
      return json({ error: err.message, name: err.name }, err.status ?? 500)
    }
    return json({ error: 'Error inesperado en el proxy' }, 500)
  }
})
```

- [ ] **Step 4: Configurar el secreto de la API key**

```bash
supabase secrets set NUMISTA_API_KEY=<tu-api-key>
```

- [ ] **Step 5: Desplegar la función**

```bash
supabase functions deploy numista-proxy
```

- [ ] **Step 6: Verificar que rechaza peticiones sin autenticación**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  "<SUPABASE_URL>/functions/v1/numista-proxy" \
  -H "Content-Type: application/json" \
  -d '{"op":"searchByKm","km":"2"}'
```

Expected: `401`. El proxy no puede ser un endpoint abierto: cada llamada gasta cuota.

- [ ] **Step 7: Verificar el caché con una llamada autenticada**

Obtener un access token iniciando sesión en el proyecto (o desde el panel de Supabase), y llamar dos veces:

```bash
curl -s -X POST "<SUPABASE_URL>/functions/v1/numista-proxy" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"op":"getType","typeId":420}' | head -c 200
```

Expected: la primera llamada responde `"fromCache":false`; la segunda, `"fromCache":true` y de forma notablemente más rápida.

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/
git commit -m "feat: Edge Function numista-proxy con caché en Postgres"
```

---

### Task 6: Cliente de Supabase, autenticación y rutas

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/types.ts`, `src/features/auth/AuthProvider.tsx`, `src/features/auth/LoginPage.tsx`, `src/features/auth/RequireAuth.tsx`, `src/features/auth/LoginPage.test.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`

**Interfaces:**
- Consumes: `GradeCode` de `src/lib/grades.ts`.
- Produces:
  - `supabase` — instancia de `SupabaseClient`
  - `useAuth(): { session: Session | null; loading: boolean; signIn(email: string): Promise<void>; signOut(): Promise<void> }`
  - `<RequireAuth>` — envoltorio de rutas que redirige a `/login` si no hay sesión
  - `interface CoinItem` con `id`, `numista_id`, `numista_issue_id`, `grade`, `condition_notes`, `location`, `notes`, `created_at`

- [ ] **Step 1: Escribir `src/lib/supabase/client.ts`**

```ts
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el entorno.')
}

export const supabase = createClient(url, anonKey)
```

- [ ] **Step 2: Escribir `src/lib/supabase/types.ts`**

```ts
import type { GradeCode } from '../grades'

export interface CoinItem {
  id: string
  numista_id: number
  numista_issue_id: number | null
  grade: GradeCode | null
  condition_notes: string | null
  location: string | null
  notes: string | null
  created_at: string
}

export interface CoinType {
  numista_id: number
  title: string
  issuer_code: string | null
  issuer_name: string | null
  min_year: number | null
  max_year: number | null
  km_number: string | null
  obverse_thumbnail: string | null
  reverse_thumbnail: string | null
}
```

- [ ] **Step 3: Escribir el test que falla**

Crear `src/features/auth/LoginPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginPage } from './LoginPage'

const signIn = vi.fn()

vi.mock('./AuthProvider', () => ({
  useAuth: () => ({ session: null, loading: false, signIn, signOut: vi.fn() }),
}))

test('envía el correo al pedir el enlace de acceso', async () => {
  const user = userEvent.setup()
  render(<LoginPage />)

  await user.type(screen.getByLabelText(/correo/i), 'coleccionista@ejemplo.cl')
  await user.click(screen.getByRole('button', { name: /enviar enlace/i }))

  expect(signIn).toHaveBeenCalledWith('coleccionista@ejemplo.cl')
})

test('confirma el envío del enlace', async () => {
  const user = userEvent.setup()
  render(<LoginPage />)

  await user.type(screen.getByLabelText(/correo/i), 'coleccionista@ejemplo.cl')
  await user.click(screen.getByRole('button', { name: /enviar enlace/i }))

  expect(await screen.findByText(/revisa tu correo/i)).toBeInTheDocument()
})
```

- [ ] **Step 4: Ejecutar el test y verificar que falla**

Run: `npx vitest run src/features/auth/LoginPage.test.tsx`
Expected: FAIL — no existe el módulo `./LoginPage`.

- [ ] **Step 5: Escribir `src/features/auth/AuthProvider.tsx`**

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase/client'

interface AuthValue {
  session: Session | null
  loading: boolean
  signIn: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signIn(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
```

- [ ] **Step 6: Escribir `src/features/auth/LoginPage.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { useAuth } from './AuthProvider'

export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await signIn(email)
      setSent(true)
    } catch {
      setError('No se pudo enviar el enlace. Revisa el correo e inténtalo otra vez.')
    }
  }

  return (
    <main>
      <h1>Mi Colección de Monedas</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Enviar enlace de acceso</button>
      </form>
      {sent && <p role="status">Revisa tu correo: te enviamos un enlace para entrar.</p>}
      {error && <p role="alert">{error}</p>}
    </main>
  )
}
```

- [ ] **Step 7: Ejecutar el test y verificar que pasa**

Run: `npx vitest run src/features/auth/LoginPage.test.tsx`
Expected: PASS — 2 tests.

- [ ] **Step 8: Escribir `src/features/auth/RequireAuth.tsx`**

```tsx
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <p>Cargando…</p>
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}
```

- [ ] **Step 9: Cablear rutas en `src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './features/auth/AuthProvider'
import { RequireAuth } from './features/auth/RequireAuth'
import { LoginPage } from './features/auth/LoginPage'
import { CollectionPage } from './features/collection/CollectionPage'
import { AddCoinPage } from './features/add-coin/AddCoinPage'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<RequireAuth><CollectionPage /></RequireAuth>} />
            <Route path="/agregar" element={<RequireAuth><AddCoinPage /></RequireAuth>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
```

`CollectionPage` y `AddCoinPage` se crean en las tareas 7 y 8. Hasta entonces, este archivo no compila: crear ambos como componentes mínimos que devuelvan `<h1>Colección</h1>` y `<h1>Agregar moneda</h1>` para mantener el árbol verde.

- [ ] **Step 10: Borrar el test obsoleto de la Tarea 1**

`src/App.test.tsx` esperaba un encabezado que ya no está en la raíz. Borrarlo:

```bash
rm src/App.test.tsx
```

- [ ] **Step 11: Ejecutar toda la suite**

Run: `npm test`
Expected: PASS — todos los tests.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: cliente de Supabase, autenticación por magic link y rutas"
```

---

### Task 7: Cliente del proxy en el frontend

**Files:**
- Create: `src/lib/numista/proxyClient.ts`, `src/lib/numista/proxyClient.test.ts`

**Interfaces:**
- Consumes: `supabase` de `src/lib/supabase/client.ts`; tipos de `shared/numista/types.ts`; errores de `shared/numista/errors.ts`.
- Produces:
  - `searchByKm(km: string): Promise<NumistaSearchResult>`
  - `searchCatalogue(params: { issuer?: string; q?: string; year?: string }): Promise<NumistaSearchResult>`
  - `getTypeWithIssues(typeId: number): Promise<{ type: NumistaType; issues: NumistaIssue[] }>`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/numista/proxyClient.test.ts`:

```ts
import { searchByKm } from './proxyClient'
import { NumistaQuotaError } from '../../../shared/numista/errors'

const invoke = vi.fn()

vi.mock('../supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}))

beforeEach(() => invoke.mockReset())

test('invoca el proxy con la operación de búsqueda por KM', async () => {
  invoke.mockResolvedValue({ data: { count: 0, types: [] }, error: null })

  await searchByKm('360.1')

  expect(invoke).toHaveBeenCalledWith('numista-proxy', {
    body: { op: 'searchByKm', km: '360.1' },
  })
})

test('devuelve los resultados del catálogo', async () => {
  invoke.mockResolvedValue({
    data: { count: 1, types: [{ id: 420, title: '5 Cents - Victoria' }] },
    error: null,
  })

  const result = await searchByKm('2')

  expect(result.count).toBe(1)
  expect(result.types[0].title).toBe('5 Cents - Victoria')
})

test('traduce el 429 del proxy a un error de cuota', async () => {
  invoke.mockResolvedValue({
    data: { name: 'NumistaQuotaError', error: 'Se agotó la cuota mensual de la API de Numista.' },
    error: { message: 'Edge Function returned a non-2xx status code' },
  })

  await expect(searchByKm('2')).rejects.toBeInstanceOf(NumistaQuotaError)
})
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `npx vitest run src/lib/numista/proxyClient.test.ts`
Expected: FAIL — no existe el módulo `./proxyClient`.

- [ ] **Step 3: Escribir `src/lib/numista/proxyClient.ts`**

```ts
import { supabase } from '../supabase/client'
import type {
  NumistaSearchResult,
  NumistaType,
  NumistaIssue,
} from '../../../shared/numista/types'
import {
  NumistaError,
  NumistaQuotaError,
  NumistaNotFoundError,
  NumistaAuthError,
} from '../../../shared/numista/errors'

/**
 * Reconstruye el error de dominio a partir de la respuesta del proxy.
 * supabase.functions.invoke colapsa cualquier respuesta no-2xx en un error
 * genérico, así que la discriminación se hace por el campo `name` del cuerpo.
 */
function toDomainError(data: unknown): NumistaError {
  const name = (data as { name?: string } | null)?.name
  switch (name) {
    case 'NumistaQuotaError': return new NumistaQuotaError()
    case 'NumistaNotFoundError': return new NumistaNotFoundError()
    case 'NumistaAuthError': return new NumistaAuthError()
    default: return new NumistaError('No se pudo consultar el catálogo de Numista.')
  }
}

async function callProxy<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('numista-proxy', { body })
  if (error) throw toDomainError(data)
  return data as T
}

export function searchByKm(km: string): Promise<NumistaSearchResult> {
  return callProxy({ op: 'searchByKm', km })
}

export function searchCatalogue(
  params: { issuer?: string; q?: string; year?: string },
): Promise<NumistaSearchResult> {
  return callProxy({ op: 'search', ...params })
}

export function getTypeWithIssues(
  typeId: number,
): Promise<{ type: NumistaType; issues: NumistaIssue[] }> {
  return callProxy({ op: 'getType', typeId })
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `npx vitest run src/lib/numista/proxyClient.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/numista/
git commit -m "feat: cliente del proxy de Numista para el frontend"
```

---

### Task 8: Búsqueda por KM y alta de la moneda

**Files:**
- Create: `src/features/add-coin/useSearchByKm.ts`, `src/features/add-coin/KmSearchForm.tsx`, `src/features/add-coin/TypeResultList.tsx`, `src/features/add-coin/IssuePicker.tsx`, `src/features/add-coin/ItemForm.tsx`, `src/features/add-coin/saveItem.ts`, `src/features/add-coin/KmSearchForm.test.tsx`, `src/features/add-coin/ItemForm.test.tsx`
- Modify: `src/features/add-coin/AddCoinPage.tsx`

**Interfaces:**
- Consumes: `searchByKm`, `getTypeWithIssues` de `src/lib/numista/proxyClient.ts`; `GRADES` de `src/lib/grades.ts`; `supabase`.
- Produces:
  - `saveItem(input: { numistaId: number; numistaIssueId: number | null; grade: GradeCode | null; conditionNotes: string; location: string; notes: string }): Promise<string>` — devuelve el id del ejemplar creado.

- [ ] **Step 1: Escribir el test que falla del formulario de búsqueda**

Crear `src/features/add-coin/KmSearchForm.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KmSearchForm } from './KmSearchForm'

test('entrega el KM buscado sin espacios sobrantes', async () => {
  const onSearch = vi.fn()
  const user = userEvent.setup()
  render(<KmSearchForm onSearch={onSearch} isSearching={false} />)

  await user.type(screen.getByLabelText(/número km/i), '  360.1 ')
  await user.click(screen.getByRole('button', { name: /buscar/i }))

  expect(onSearch).toHaveBeenCalledWith('360.1')
})

test('no busca con el campo vacío', async () => {
  const onSearch = vi.fn()
  const user = userEvent.setup()
  render(<KmSearchForm onSearch={onSearch} isSearching={false} />)

  await user.click(screen.getByRole('button', { name: /buscar/i }))

  expect(onSearch).not.toHaveBeenCalled()
})

test('deshabilita el botón mientras busca', () => {
  render(<KmSearchForm onSearch={vi.fn()} isSearching={true} />)
  expect(screen.getByRole('button', { name: /buscando/i })).toBeDisabled()
})
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `npx vitest run src/features/add-coin/KmSearchForm.test.tsx`
Expected: FAIL — no existe el módulo `./KmSearchForm`.

- [ ] **Step 3: Escribir `src/features/add-coin/KmSearchForm.tsx`**

```tsx
import { useState, type FormEvent } from 'react'

interface Props {
  onSearch: (km: string) => void
  isSearching: boolean
}

export function KmSearchForm({ onSearch, isSearching }: Props) {
  const [km, setKm] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = km.trim()
    if (!trimmed) return
    onSearch(trimmed)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="km">Número KM</label>
      <input
        id="km"
        type="text"
        inputMode="decimal"
        value={km}
        onChange={(e) => setKm(e.target.value)}
        placeholder="Por ejemplo: 360.1"
      />
      <button type="submit" disabled={isSearching}>
        {isSearching ? 'Buscando…' : 'Buscar'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `npx vitest run src/features/add-coin/KmSearchForm.test.tsx`
Expected: PASS — 3 tests.

- [ ] **Step 5: Escribir `src/features/add-coin/useSearchByKm.ts`**

```ts
import { useMutation } from '@tanstack/react-query'
import { searchByKm } from '../../lib/numista/proxyClient'

export function useSearchByKm() {
  return useMutation({ mutationFn: (km: string) => searchByKm(km) })
}
```

- [ ] **Step 6: Escribir `src/features/add-coin/TypeResultList.tsx`**

```tsx
import type { NumistaType } from '../../../shared/numista/types'
import { extractKmNumber } from '../../../shared/numista/references'

interface Props {
  types: NumistaType[]
  onSelect: (type: NumistaType) => void
}

export function TypeResultList({ types, onSelect }: Props) {
  if (types.length === 0) {
    return <p>No se encontraron monedas con ese número KM.</p>
  }

  return (
    <ul>
      {types.map((type) => (
        <li key={type.id}>
          <button type="button" onClick={() => onSelect(type)}>
            {type.obverse?.thumbnail && (
              <img src={type.obverse.thumbnail} alt="" width={60} height={60} />
            )}
            <span>{type.title}</span>
            <span>{type.issuer?.name}</span>
            <span>
              {type.min_year}
              {type.max_year && type.max_year !== type.min_year ? `–${type.max_year}` : ''}
            </span>
            {extractKmNumber(type.references) && (
              <span>KM #{extractKmNumber(type.references)}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 7: Escribir `src/features/add-coin/IssuePicker.tsx`**

```tsx
import type { NumistaIssue } from '../../../shared/numista/types'
import { extractKmNumber } from '../../../shared/numista/references'

interface Props {
  issues: NumistaIssue[]
  selectedId: number | null
  onSelect: (issueId: number | null) => void
}

export function IssuePicker({ issues, selectedId, onSelect }: Props) {
  return (
    <fieldset>
      <legend>Emisión</legend>
      <p>
        Elige el año y ceca exactos de tu moneda. Sin emisión no se puede
        obtener el valor estimado.
      </p>
      <ul>
        {issues.map((issue) => (
          <li key={issue.id}>
            <label>
              <input
                type="radio"
                name="issue"
                checked={selectedId === issue.id}
                onChange={() => onSelect(issue.id)}
              />
              {issue.year ?? 'Sin fecha'}
              {issue.mint_letter ? ` · Ceca ${issue.mint_letter}` : ''}
              {issue.mintage ? ` · Tirada ${issue.mintage.toLocaleString('es')}` : ''}
              {extractKmNumber(issue.references) ? ` · KM #${extractKmNumber(issue.references)}` : ''}
              {issue.comment ? ` · ${issue.comment}` : ''}
            </label>
          </li>
        ))}
        <li>
          <label>
            <input
              type="radio"
              name="issue"
              checked={selectedId === null}
              onChange={() => onSelect(null)}
            />
            No estoy segura de la emisión
          </label>
        </li>
      </ul>
    </fieldset>
  )
}
```

- [ ] **Step 8: Escribir el test que falla del formulario del ejemplar**

Crear `src/features/add-coin/ItemForm.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemForm } from './ItemForm'

test('ofrece los siete grados de la escala', () => {
  render(<ItemForm onSubmit={vi.fn()} isSaving={false} />)
  const select = screen.getByLabelText(/estado/i)
  // siete grados más la opción "sin especificar"
  expect(select.querySelectorAll('option')).toHaveLength(8)
})

test('entrega los datos propios al guardar', async () => {
  const onSubmit = vi.fn()
  const user = userEvent.setup()
  render(<ItemForm onSubmit={onSubmit} isSaving={false} />)

  await user.selectOptions(screen.getByLabelText(/estado/i), 'xf')
  await user.type(screen.getByLabelText(/ubicación/i), 'Álbum 2, página 5')
  await user.type(screen.getByLabelText(/notas/i), 'Regalo de mi abuelo')
  await user.click(screen.getByRole('button', { name: /guardar/i }))

  expect(onSubmit).toHaveBeenCalledWith({
    grade: 'xf',
    conditionNotes: '',
    location: 'Álbum 2, página 5',
    notes: 'Regalo de mi abuelo',
  })
})

test('permite guardar sin especificar el grado', async () => {
  const onSubmit = vi.fn()
  const user = userEvent.setup()
  render(<ItemForm onSubmit={onSubmit} isSaving={false} />)

  await user.click(screen.getByRole('button', { name: /guardar/i }))

  expect(onSubmit).toHaveBeenCalledWith({
    grade: null,
    conditionNotes: '',
    location: '',
    notes: '',
  })
})
```

- [ ] **Step 9: Ejecutar el test y verificar que falla**

Run: `npx vitest run src/features/add-coin/ItemForm.test.tsx`
Expected: FAIL — no existe el módulo `./ItemForm`.

- [ ] **Step 10: Escribir `src/features/add-coin/ItemForm.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { GRADES, type GradeCode } from '../../lib/grades'

export interface ItemFormValues {
  grade: GradeCode | null
  conditionNotes: string
  location: string
  notes: string
}

interface Props {
  onSubmit: (values: ItemFormValues) => void
  isSaving: boolean
}

export function ItemForm({ onSubmit, isSaving }: Props) {
  const [grade, setGrade] = useState<GradeCode | ''>('')
  const [conditionNotes, setConditionNotes] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit({
      grade: grade === '' ? null : grade,
      conditionNotes,
      location,
      notes,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="grade">Estado de conservación</label>
      <select
        id="grade"
        value={grade}
        onChange={(e) => setGrade(e.target.value as GradeCode | '')}
      >
        <option value="">Sin especificar</option>
        {GRADES.map((g) => (
          <option key={g.code} value={g.code}>{g.label}</option>
        ))}
      </select>

      <label htmlFor="conditionNotes">Observaciones del estado</label>
      <input
        id="conditionNotes"
        value={conditionNotes}
        onChange={(e) => setConditionNotes(e.target.value)}
      />

      <label htmlFor="location">Ubicación física</label>
      <input
        id="location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Álbum, cajón, cápsula…"
      />

      <label htmlFor="notes">Notas</label>
      <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

      <button type="submit" disabled={isSaving}>
        {isSaving ? 'Guardando…' : 'Guardar moneda'}
      </button>
    </form>
  )
}
```

- [ ] **Step 11: Ejecutar el test y verificar que pasa**

Run: `npx vitest run src/features/add-coin/ItemForm.test.tsx`
Expected: PASS — 3 tests.

- [ ] **Step 12: Escribir `src/features/add-coin/saveItem.ts`**

El tipo y sus emisiones ya quedaron cacheados en Postgres por el proxy al llamar a `getTypeWithIssues`, así que aquí solo se inserta el ejemplar.

```ts
import { supabase } from '../../lib/supabase/client'
import type { GradeCode } from '../../lib/grades'

export interface SaveItemInput {
  numistaId: number
  numistaIssueId: number | null
  grade: GradeCode | null
  conditionNotes: string
  location: string
  notes: string
}

export async function saveItem(input: SaveItemInput): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa.')

  const { data, error } = await supabase
    .from('coins_items')
    .insert({
      owner_id: user.id,
      numista_id: input.numistaId,
      numista_issue_id: input.numistaIssueId,
      grade: input.grade,
      condition_notes: input.conditionNotes || null,
      location: input.location || null,
      notes: input.notes || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`No se pudo guardar la moneda: ${error.message}`)
  return data.id as string
}
```

- [ ] **Step 13: Componer el flujo en `src/features/add-coin/AddCoinPage.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import type { NumistaType, NumistaIssue } from '../../../shared/numista/types'
import { NumistaQuotaError } from '../../../shared/numista/errors'
import { getTypeWithIssues } from '../../lib/numista/proxyClient'
import { useSearchByKm } from './useSearchByKm'
import { KmSearchForm } from './KmSearchForm'
import { TypeResultList } from './TypeResultList'
import { IssuePicker } from './IssuePicker'
import { ItemForm, type ItemFormValues } from './ItemForm'
import { saveItem } from './saveItem'

export function AddCoinPage() {
  const navigate = useNavigate()
  const search = useSearchByKm()
  const [selected, setSelected] = useState<
    { type: NumistaType; issues: NumistaIssue[] } | null
  >(null)
  const [issueId, setIssueId] = useState<number | null>(null)

  const loadType = useMutation({
    mutationFn: (type: NumistaType) => getTypeWithIssues(type.id),
    onSuccess: (data) => {
      setSelected(data)
      setIssueId(null)
    },
  })

  const save = useMutation({
    mutationFn: (values: ItemFormValues) =>
      saveItem({
        numistaId: selected!.type.id,
        numistaIssueId: issueId,
        ...values,
      }),
    onSuccess: () => navigate('/'),
  })

  const error = search.error ?? loadType.error ?? save.error

  return (
    <main>
      <h1>Agregar moneda</h1>

      {!selected && (
        <>
          <KmSearchForm
            onSearch={(km) => search.mutate(km)}
            isSearching={search.isPending}
          />
          {search.data && (
            <TypeResultList
              types={search.data.types}
              onSelect={(type) => loadType.mutate(type)}
            />
          )}
        </>
      )}

      {selected && (
        <>
          <h2>{selected.type.title}</h2>
          <p>{selected.type.issuer?.name}</p>
          <button type="button" onClick={() => setSelected(null)}>
            Elegir otra moneda
          </button>
          <IssuePicker
            issues={selected.issues}
            selectedId={issueId}
            onSelect={setIssueId}
          />
          <ItemForm onSubmit={(v) => save.mutate(v)} isSaving={save.isPending} />
        </>
      )}

      {error && (
        <p role="alert">
          {error instanceof NumistaQuotaError
            ? 'Se agotó la cuota mensual de la API de Numista. Las monedas ya consultadas siguen disponibles; vuelve a intentarlo el próximo mes.'
            : error.message}
        </p>
      )}
    </main>
  )
}
```

- [ ] **Step 14: Ejecutar toda la suite**

Run: `npm test`
Expected: PASS — todos los tests.

- [ ] **Step 15: Commit**

```bash
git add src/features/add-coin/
git commit -m "feat: búsqueda por KM, selección de emisión y alta de monedas"
```

---

### Task 9: Listado de la colección

Listado plano ordenado por fecha de alta. La navegación jerárquica Continente → País llega en el Plan 2.

**Files:**
- Create: `src/features/collection/useCollection.ts`, `src/features/collection/CoinCard.tsx`, `src/features/collection/CoinCard.test.tsx`
- Modify: `src/features/collection/CollectionPage.tsx`

**Interfaces:**
- Consumes: `supabase`, `gradeLabel` de `src/lib/grades.ts`.
- Produces:
  - `interface CollectionEntry { id: string; grade: GradeCode | null; title: string; issuerName: string | null; kmNumber: string | null; issueYear: number | null; thumbnail: string | null }`
  - `useCollection(): UseQueryResult<CollectionEntry[]>`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/features/collection/CoinCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { CoinCard } from './CoinCard'

const entry = {
  id: 'abc',
  grade: 'xf' as const,
  title: '5 Cents - Victoria',
  issuerName: 'Canadá',
  kmNumber: '2',
  issueYear: 1870,
  thumbnail: 'https://ejemplo.cl/moneda.jpg',
}

test('muestra el título, país, año y KM de la moneda', () => {
  render(<CoinCard entry={entry} />)
  expect(screen.getByText('5 Cents - Victoria')).toBeInTheDocument()
  expect(screen.getByText('Canadá')).toBeInTheDocument()
  expect(screen.getByText('1870')).toBeInTheDocument()
  expect(screen.getByText(/KM #2/)).toBeInTheDocument()
})

test('muestra el grado con su etiqueta en español', () => {
  render(<CoinCard entry={entry} />)
  expect(screen.getByText(/extraordinariamente bien conservada/i)).toBeInTheDocument()
})

test('no rompe cuando faltan la foto y el grado', () => {
  render(<CoinCard entry={{ ...entry, thumbnail: null, grade: null, issueYear: null }} />)
  expect(screen.getByText('5 Cents - Victoria')).toBeInTheDocument()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `npx vitest run src/features/collection/CoinCard.test.tsx`
Expected: FAIL — no existe el módulo `./CoinCard`.

- [ ] **Step 3: Escribir `src/features/collection/useCollection.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/client'
import type { GradeCode } from '../../lib/grades'

export interface CollectionEntry {
  id: string
  grade: GradeCode | null
  title: string
  issuerName: string | null
  kmNumber: string | null
  issueYear: number | null
  thumbnail: string | null
}

interface Row {
  id: string
  grade: GradeCode | null
  coins_types: {
    title: string
    issuer_name: string | null
    km_number: string | null
    obverse_thumbnail: string | null
  }
  coins_issues: { year: number | null; km_number: string | null } | null
}

export function useCollection() {
  return useQuery({
    queryKey: ['collection'],
    queryFn: async (): Promise<CollectionEntry[]> => {
      const { data, error } = await supabase
        .from('coins_items')
        .select(`
          id,
          grade,
          coins_types ( title, issuer_name, km_number, obverse_thumbnail ),
          coins_issues ( year, km_number )
        `)
        .order('created_at', { ascending: false })

      if (error) throw new Error(`No se pudo cargar la colección: ${error.message}`)

      return (data as unknown as Row[]).map((row) => ({
        id: row.id,
        grade: row.grade,
        title: row.coins_types.title,
        issuerName: row.coins_types.issuer_name,
        // El KM de la emisión es más específico que el del tipo cuando existe.
        kmNumber: row.coins_issues?.km_number ?? row.coins_types.km_number,
        issueYear: row.coins_issues?.year ?? null,
        thumbnail: row.coins_types.obverse_thumbnail,
      }))
    },
  })
}
```

- [ ] **Step 4: Escribir `src/features/collection/CoinCard.tsx`**

```tsx
import { gradeLabel } from '../../lib/grades'
import type { CollectionEntry } from './useCollection'

export function CoinCard({ entry }: { entry: CollectionEntry }) {
  return (
    <article>
      {entry.thumbnail && <img src={entry.thumbnail} alt="" width={120} height={120} />}
      <h3>{entry.title}</h3>
      {entry.issuerName && <p>{entry.issuerName}</p>}
      {entry.issueYear && <p>{entry.issueYear}</p>}
      {entry.kmNumber && <p>KM #{entry.kmNumber}</p>}
      {entry.grade && <p>{gradeLabel(entry.grade)}</p>}
    </article>
  )
}
```

- [ ] **Step 5: Ejecutar el test y verificar que pasa**

Run: `npx vitest run src/features/collection/CoinCard.test.tsx`
Expected: PASS — 3 tests.

- [ ] **Step 6: Escribir `src/features/collection/CollectionPage.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { useCollection } from './useCollection'
import { CoinCard } from './CoinCard'

export function CollectionPage() {
  const { data, isLoading, error } = useCollection()

  return (
    <main>
      <h1>Mi Colección de Monedas</h1>
      <Link to="/agregar">Agregar moneda</Link>

      {isLoading && <p>Cargando colección…</p>}
      {error && <p role="alert">{(error as Error).message}</p>}

      {data && (
        <>
          <p>{data.length} monedas</p>
          {data.length === 0 ? (
            <p>Todavía no tienes monedas registradas. Empieza agregando una por su número KM.</p>
          ) : (
            <div>
              {data.map((entry) => <CoinCard key={entry.id} entry={entry} />)}
            </div>
          )}
        </>
      )}
    </main>
  )
}
```

- [ ] **Step 7: Ejecutar toda la suite**

Run: `npm test`
Expected: PASS — todos los tests.

- [ ] **Step 8: Verificar el flujo completo a mano**

```bash
npm run dev
```

Con el navegador a 390 px de ancho (herramientas de desarrollo, modo móvil):

1. Entrar con el magic link.
2. Ir a "Agregar moneda", buscar el KM `2`.
3. Elegir un tipo de los resultados y luego una emisión.
4. Poner grado, ubicación y notas, y guardar.
5. Confirmar que la moneda aparece en la colección con su KM y su grado.

- [ ] **Step 9: Commit**

```bash
git add src/features/collection/
git commit -m "feat: listado de la colección"
```

---

## Verificación final del plan

- [ ] `npm test` pasa completo.
- [ ] `npm run build` termina sin errores.
- [ ] Buscar `NUMISTA_API_KEY` en `src/` no arroja resultados: `grep -rn "NUMISTA_API_KEY" src/` debe salir vacío.
- [ ] Una moneda registrada se ve en la colección tras recargar la página.
- [ ] Pedir dos veces el mismo tipo responde `fromCache: true` la segunda vez.

## Siguientes planes

- **Plan 2** — fotos (recorte 1:1, redimensionado a 1200 px, WebP, Storage), página de detalle con edición y borrado, navegación jerárquica Continente → País con `coins_regions` sembrada desde `/issuers`, búsqueda por país + denominación + año, y buscador local sobre la colección.
- **Plan 3** — precios con histórico (`coins_prices`), vista pública en `/publica` sobre `coins_public_items`, y pantalla de ajustes (regiones sin clasificar, recarga de caché, uso de cuota).

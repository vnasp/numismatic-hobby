import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useMeta } from './useMeta'

/** La fila de `coins_metas`, que cada prueba ajusta. */
let metaRow: Record<string, unknown> | null = {
  slug: 'chile-1900',
  name: 'Chile desde 1900',
  issuer_code: 'chili',
  from_year: 1900,
  to_year: null,
  counted_object_types: ['Monedas circulantes normales'],
  listed_at: '2026-09-20T00:00:00Z',
}
let metaTypeRows: Record<string, unknown>[] = []
/** Los tipos cuyo detalle ya está en caché, con sus referencias. */
let cachedRows: Record<string, unknown>[] = []
/** Los `numista_id` que hay en la colección. */
let ownedIds: number[] = []

vi.mock('../../lib/supabase/client', () => ({
  supabase: {
    from(table: string) {
      if (table === 'coins_metas') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: metaRow, error: null }) }),
          }),
        }
      }
      if (table === 'coins_meta_types') {
        return {
          select: () => ({ eq: async () => ({ data: metaTypeRows, error: null }) }),
        }
      }
      if (table === 'coins_types') {
        return { select: () => ({ in: async () => ({ data: cachedRows, error: null }) }) }
      }
      if (table === 'coins_items') {
        return {
          select: () => ({
            in: async () => ({
              data: ownedIds.map((numista_id) => ({ numista_id })),
              error: null,
            }),
          }),
        }
      }
      throw new Error(`tabla inesperada: ${table}`)
    },
  },
}))

function tipo(numista_id: number, overrides: Record<string, unknown> = {}) {
  return {
    numista_id,
    title: '20 Centavos',
    object_type_name: 'Monedas circulantes normales',
    min_year: 1920,
    max_year: 1941,
    obverse_thumbnail: null,
    reverse_thumbnail: null,
    ...overrides,
  }
}

function km(numista_id: number, number: string) {
  return { numista_id, refs: [{ catalogue: { id: 3, code: 'KM' }, number }] }
}

function renderMeta() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderHook(() => useMeta('chile-1900'), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  })
}

beforeEach(() => {
  metaRow = {
    slug: 'chile-1900',
    name: 'Chile desde 1900',
    issuer_code: 'chili',
    from_year: 1900,
    to_year: null,
    counted_object_types: ['Monedas circulantes normales'],
    listed_at: '2026-09-20T00:00:00Z',
  }
  metaTypeRows = []
  cachedRows = []
  ownedIds = []
})

test('agrupa en una casilla los tipos que comparten número de catálogo', async () => {
  // Las tres variantes del 20 Centavos que Numista distingue por anverso.
  metaTypeRows = [tipo(16044), tipo(6920), tipo(16106)]
  cachedRows = [km(16044, '151'), km(6920, '151'), km(16106, '151')]

  const { result } = renderMeta()
  await waitFor(() => expect(result.current.data).toBeTruthy())

  expect(result.current.data!.slots).toHaveLength(1)
  expect(result.current.data!.slots[0].reference).toBe('KM #151')
  expect(result.current.data!.slots[0].types).toHaveLength(3)
})

test('una casilla se da por conseguida con tener cualquiera de sus variantes', async () => {
  metaTypeRows = [tipo(16044), tipo(6920)]
  cachedRows = [km(16044, '151'), km(6920, '151')]
  ownedIds = [6920]

  const { result } = renderMeta()
  await waitFor(() => expect(result.current.data).toBeTruthy())

  expect(result.current.data!.slots[0].owned).toBe(true)
})

test('los números distintos son casillas distintas, aunque sean la misma moneda', async () => {
  // KM 151 y KM 151a son dos piezas a conseguir, no una.
  metaTypeRows = [tipo(1), tipo(2)]
  cachedRows = [km(1, '151'), km(2, '151a')]

  const { result } = renderMeta()
  await waitFor(() => expect(result.current.data).toBeTruthy())

  expect(result.current.data!.slots.map((s) => s.reference)).toEqual(['KM #151', 'KM #151a'])
})

test('ordena los números de forma natural: 2 antes que 10, y 179 antes que 179a', async () => {
  metaTypeRows = [tipo(1), tipo(2), tipo(3), tipo(4)]
  cachedRows = [km(1, '179a'), km(2, '10'), km(3, '2'), km(4, '179')]

  const { result } = renderMeta()
  await waitFor(() => expect(result.current.data).toBeTruthy())

  expect(result.current.data!.slots.map((s) => s.reference)).toEqual([
    'KM #2',
    'KM #10',
    'KM #179',
    'KM #179a',
  ])
})

test('deja fuera del recuento los tipos que la meta no cuenta', async () => {
  metaTypeRows = [
    tipo(1),
    tipo(2, { object_type_name: 'Monedas de ensayo' }),
    tipo(3, { object_type_name: 'Monedas no circulantes' }),
  ]
  cachedRows = [km(1, '151')]

  const { result } = renderMeta()
  await waitFor(() => expect(result.current.data).toBeTruthy())

  // Un ensayo no es una moneda que se persiga: no infla el denominador.
  expect(result.current.data!.slots).toHaveLength(1)
  expect(result.current.data!.uncountedCount).toBe(2)
})

test('los tipos sin detalle bajado quedan aparte y al final, no como huecos', async () => {
  metaTypeRows = [tipo(1), tipo(2)]
  cachedRows = [km(2, '151')]

  const { result } = renderMeta()
  await waitFor(() => expect(result.current.data).toBeTruthy())

  const meta = result.current.data!
  expect(meta.pendingDetail).toBe(1)
  // El que tiene número va primero; el que no se sabe, al final.
  expect(meta.slots.map((s) => s.reference)).toEqual(['KM #151', null])
})

test('sin listado traído, la meta existe pero no tiene casillas', async () => {
  metaRow = { ...(metaRow as Record<string, unknown>), listed_at: null }

  const { result } = renderMeta()
  await waitFor(() => expect(result.current.data).toBeTruthy())

  expect(result.current.data!.listed).toBe(false)
  expect(result.current.data!.slots).toEqual([])
})

test('una meta que no existe devuelve null, no un error', async () => {
  metaRow = null

  const { result } = renderMeta()
  await waitFor(() => expect(result.current.isSuccess).toBe(true))

  expect(result.current.data).toBeNull()
})

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useCollection } from './useCollection'

const order = vi.fn()
const select = vi.fn((..._args: unknown[]) => ({ order }))
const regionsIn = vi.fn()
const regionsSelect = vi.fn((..._args: unknown[]) => ({ in: regionsIn }))
const from = vi.fn((table: string) =>
  table === 'coins_regions' ? { select: regionsSelect } : { select },
)

vi.mock('../../lib/supabase/client', () => ({
  supabase: { from: (table: string) => from(table) },
}))

function row(overrides: Record<string, unknown>) {
  return {
    id: 'item-1',
    grade: 'xf',
    coins_types: {
      title: '10 Pesos',
      issuer_code: 'chili',
      issuer_name: 'Chile',
      refs: [{ catalogue: { id: 3, code: 'KM' }, number: '206' }],
      obverse_thumbnail: 'https://ejemplo.cl/anverso.jpg',
      reverse_thumbnail: 'https://ejemplo.cl/reverso.jpg',
      ...overrides,
    },
    coins_issues: null,
  }
}

function renderCollection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderHook(() => useCollection(), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  })
}

beforeEach(() => {
  order.mockReset()
  select.mockClear()
  from.mockClear()
  regionsIn.mockReset()
  regionsSelect.mockClear()
  regionsIn.mockResolvedValue({ data: [], error: null })
})

test('muestra el reverso de la moneda, no el anverso', async () => {
  order.mockResolvedValue({ data: [row({})], error: null })

  const { result } = renderCollection()

  await waitFor(() => expect(result.current.data).toBeDefined())
  expect(result.current.data![0].thumbnail).toBe('https://ejemplo.cl/reverso.jpg')
})

test('cae al anverso cuando Numista no tiene foto del reverso', async () => {
  order.mockResolvedValue({ data: [row({ reverse_thumbnail: null })], error: null })

  const { result } = renderCollection()

  await waitFor(() => expect(result.current.data).toBeDefined())
  expect(result.current.data![0].thumbnail).toBe('https://ejemplo.cl/anverso.jpg')
})

test('deja la ficha sin imagen cuando no hay foto de ningún lado', async () => {
  order.mockResolvedValue({
    data: [row({ reverse_thumbnail: null, obverse_thumbnail: null })],
    error: null,
  })

  const { result } = renderCollection()

  await waitFor(() => expect(result.current.data).toBeDefined())
  expect(result.current.data![0].thumbnail).toBeNull()
})

test('pide ambas miniaturas a Postgres', async () => {
  order.mockResolvedValue({ data: [], error: null })

  const { result } = renderCollection()

  await waitFor(() => expect(result.current.data).toBeDefined())
  expect(select.mock.calls[0][0]).toContain('reverse_thumbnail')
  expect(select.mock.calls[0][0]).toContain('obverse_thumbnail')
})

test('usa el Y# cuando la moneda no tiene KM, como en Venezuela', async () => {
  order.mockResolvedValue({
    data: [row({ refs: [{ catalogue: { id: 9, code: 'Y' }, number: '42' }] })],
    error: null,
  })

  const { result } = renderCollection()

  await waitFor(() => expect(result.current.data).toBeDefined())
  expect(result.current.data![0].reference).toEqual({ code: 'Y', number: '42' })
})

test('prefiere el KM de la emisión al del tipo', async () => {
  order.mockResolvedValue({
    data: [
      {
        ...row({}),
        coins_issues: { year: 1980, refs: [{ catalogue: { id: 3, code: 'KM' }, number: '206a' }] },
      },
    ],
    error: null,
  })

  const { result } = renderCollection()

  await waitFor(() => expect(result.current.data).toBeDefined())
  expect(result.current.data![0].reference).toEqual({ code: 'KM', number: '206a' })
})

test('asigna el continente del emisor desde coins_regions', async () => {
  order.mockResolvedValue({ data: [row({})], error: null })
  regionsIn.mockResolvedValue({ data: [{ issuer_code: 'chili', continent: 'América' }], error: null })

  const { result } = renderCollection()

  await waitFor(() => expect(result.current.data).toBeDefined())
  expect(regionsIn).toHaveBeenCalledWith('issuer_code', ['chili'])
  expect(result.current.data![0].continent).toBe('América')
})

test('muestra la colección sin continentes si coins_regions falla', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  order.mockResolvedValue({ data: [row({})], error: null })
  regionsIn.mockResolvedValue({ data: null, error: { message: 'boom' } })

  const { result } = renderCollection()

  await waitFor(() => expect(result.current.data).toBeDefined())
  expect(result.current.data![0].continent).toBeNull()
})

test('trae la otra cara para el efecto de giro', async () => {
  order.mockResolvedValue({ data: [row({})], error: null })

  const { result } = renderCollection()

  await waitFor(() => expect(result.current.data).toBeDefined())
  expect(result.current.data![0].thumbnail).toBe('https://ejemplo.cl/reverso.jpg')
  expect(result.current.data![0].thumbnailBack).toBe('https://ejemplo.cl/anverso.jpg')
})

test('sin reverso no hay otra cara: la única foto ya es el anverso', async () => {
  order.mockResolvedValue({ data: [row({ reverse_thumbnail: null })], error: null })

  const { result } = renderCollection()

  await waitFor(() => expect(result.current.data).toBeDefined())
  expect(result.current.data![0].thumbnailBack).toBeNull()
})

test('trae el material y el diámetro del catálogo cacheado', async () => {
  order.mockResolvedValue({
    data: [row({ composition_text: 'Cuproníquel', size: 24.5, weight: 5.2 })],
    error: null,
  })

  const { result } = renderCollection()

  await waitFor(() => expect(result.current.data).toBeDefined())
  expect(result.current.data![0].material).toBe('Cuproníquel')
  expect(result.current.data![0].diameterMm).toBe(24.5)
  expect(result.current.data![0].weightG).toBe(5.2)
})

test('arma la valoración anotada y la deja en null cuando no hay', async () => {
  order.mockResolvedValue({
    data: [
      {
        ...row({}),
        estimated_value: 3500,
        value_currency: 'CLP',
        value_source: 'Numista, XF',
        valued_at: '2026-09-01T12:00:00Z',
      },
      { ...row({}), id: 'item-2' },
    ],
    error: null,
  })

  const { result } = renderCollection()

  await waitFor(() => expect(result.current.data).toBeDefined())
  expect(result.current.data![0].value).toEqual({
    amount: 3500,
    currency: 'CLP',
    source: 'Numista, XF',
    at: '2026-09-01T12:00:00Z',
  })
  expect(result.current.data![1].value).toBeNull()
})

test('trae la ceca de la emisión', async () => {
  order.mockResolvedValue({
    data: [{ ...row({}), coins_issues: { year: 1981, mint_letter: 'So', refs: null } }],
    error: null,
  })

  const { result } = renderCollection()

  await waitFor(() => expect(result.current.data).toBeDefined())
  expect(result.current.data![0].mintLetter).toBe('So')
})

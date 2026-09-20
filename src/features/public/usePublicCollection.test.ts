import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { usePublicCollection } from './usePublicCollection'

const order = vi.fn()
const select = vi.fn((..._args: unknown[]) => ({ order }))
const from = vi.fn((_table: string) => ({ select }))

vi.mock('../../lib/supabase/client', () => ({
  supabase: { from: (table: string) => from(table) },
}))

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    grade: 'vf',
    numista_id: 27246,
    numista_issue_id: null,
    title: '¼ Real',
    issuer_code: 'venezuela',
    issuer_name: 'Venezuela',
    composition_text: 'Plata 835',
    weight: 1.25,
    size: 15,
    obverse_thumbnail: 'https://ejemplo.cl/anverso.jpg',
    reverse_thumbnail: 'https://ejemplo.cl/reverso.jpg',
    issue_year: 5745,
    issue_gregorian_year: 1985,
    mint_letter: 'So',
    continent: 'América',
    type_refs: [{ catalogue: { id: 9, code: 'Y' }, number: '1' }],
    issue_refs: null,
    ...overrides,
  }
}

function renderPublic() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderHook(() => usePublicCollection(), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  })
}

beforeEach(() => {
  order.mockReset()
  select.mockClear()
  from.mockClear()
})

test('lee la vista pública y no la tabla de ejemplares', async () => {
  order.mockResolvedValue({ data: [row()], error: null })

  const { result } = renderPublic()

  await waitFor(() => expect(result.current.data).toBeDefined())
  expect(from).toHaveBeenCalledWith('coins_public_items')
})

test('arma la ficha con el Y# y el año gregoriano', async () => {
  order.mockResolvedValue({ data: [row()], error: null })

  const { result } = renderPublic()

  await waitFor(() => expect(result.current.data).toBeDefined())
  const entry = result.current.data![0]
  expect(entry.reference).toEqual({ code: 'Y', number: '1' })
  expect(entry.issueYear).toBe(5745)
  expect(entry.gregorianYear).toBe(1985)
  expect(entry.material).toBe('Plata 835')
})

test('no trae valoración ni favoritos: la vista no los expone', async () => {
  order.mockResolvedValue({ data: [row()], error: null })

  const { result } = renderPublic()

  await waitFor(() => expect(result.current.data).toBeDefined())
  expect(result.current.data![0].value).toBeNull()
  expect(result.current.data![0].isFavorite).toBe(false)
  // Ninguna de las columnas privadas se pide siquiera.
  const pedido = select.mock.calls[0][0] as string
  for (const privada of ['estimated_value', 'value_currency', 'location', 'notes']) {
    expect(pedido).not.toContain(privada)
  }
})

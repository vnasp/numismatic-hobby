import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useDeleteItem } from './useDeleteItem'
import type { CollectionEntry } from './useCollection'

const eq = vi.fn()
const del = vi.fn(() => ({ eq }))
const from = vi.fn((_table: string) => ({ delete: del }))

vi.mock('../../lib/supabase/client', () => ({
  supabase: { from: (table: string) => from(table) },
}))

function entry(id: string): CollectionEntry {
  return {
    id,
    numistaId: 420,
    numistaIssueId: null,
    grade: null,
    title: '1 Peso',
    issuerCode: 'chili',
    issuerName: 'Chile',
    continent: 'América',
    reference: null,
    issueYear: null,
    mintLetter: null,
    thumbnail: null,
    thumbnailBack: null,
    material: null,
    diameterMm: null,
    weightG: null,
    value: null,
    isFavorite: false,
  }
}

function renderDelete(cached: CollectionEntry[]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(['collection'], cached)
  const view = renderHook(() => useDeleteItem(), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  })
  return { ...view, queryClient }
}

beforeEach(() => {
  eq.mockReset()
  del.mockClear()
  from.mockClear()
})

test('borra el ejemplar y lo saca de la colección al instante', async () => {
  eq.mockResolvedValue({ error: null })
  const { result, queryClient } = renderDelete([entry('a'), entry('b')])

  result.current.mutate('a')

  // Optimista: la ficha desaparece antes de que Postgres conteste.
  await waitFor(() =>
    expect(queryClient.getQueryData<CollectionEntry[]>(['collection'])).toHaveLength(1),
  )
  expect(from).toHaveBeenCalledWith('coins_items')
  expect(eq).toHaveBeenCalledWith('id', 'a')
})

test('devuelve la moneda a la grilla si el borrado falla', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  eq.mockResolvedValue({ error: { code: 'XX000', message: 'boom' } })
  const { result, queryClient } = renderDelete([entry('a'), entry('b')])

  result.current.mutate('a')

  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(result.current.error?.message).toMatch(/no se pudo eliminar/i)
  expect(queryClient.getQueryData<CollectionEntry[]>(['collection'])).toHaveLength(2)
})

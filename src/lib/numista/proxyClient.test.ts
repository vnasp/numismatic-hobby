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

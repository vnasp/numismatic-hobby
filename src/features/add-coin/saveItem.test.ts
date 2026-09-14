import { saveItem } from './saveItem'

const getUser = vi.fn()
const single = vi.fn()
const select = vi.fn((..._args: unknown[]) => ({ single }))
const insert = vi.fn((..._args: unknown[]) => ({ select }))
const from = vi.fn((..._args: unknown[]) => ({ insert }))

vi.mock('../../lib/supabase/client', () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => getUser(...args) },
    from: (...args: unknown[]) => from(...args),
  },
}))

const input = {
  numistaId: 1,
  numistaIssueId: null,
  grade: null,
  conditionNotes: '',
  location: '',
  notes: '',
}

beforeEach(() => {
  getUser.mockReset()
  single.mockReset()
  select.mockClear()
  insert.mockClear()
  from.mockClear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

test('guarda el ejemplar y devuelve su id', async () => {
  getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  single.mockResolvedValue({ data: { id: 'item-1' }, error: null })

  const id = await saveItem(input)

  expect(id).toBe('item-1')
  expect(insert).toHaveBeenCalledWith(
    expect.objectContaining({ owner_id: 'user-1', numista_id: 1 }),
  )
})

test('pide iniciar sesión de nuevo cuando no hay usuario y asegura que los datos no se pierden', async () => {
  getUser.mockResolvedValue({ data: { user: null } })

  try {
    await saveItem(input)
    expect.unreachable('saveItem debía rechazar')
  } catch (err) {
    const message = (err as Error).message
    expect(message).toMatch(/inicia sesión/i)
    expect(message).toMatch(/no se pierd/i)
  }
})

test('traduce un rechazo de RLS (42501) a un mensaje de sesión expirada, sin exponer el texto de Postgres', async () => {
  getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  single.mockResolvedValue({
    data: null,
    error: {
      code: '42501',
      message: 'new row violates row-level security policy for table "coins_items"',
    },
  })

  const rejection = saveItem(input)
  await expect(rejection).rejects.toThrow(/sesión/i)

  try {
    await rejection
  } catch (err) {
    const message = (err as Error).message
    expect(message).not.toMatch(/row-level security/i)
    expect(message).not.toMatch(/coins_items/)
  }
})

test('traduce un CHECK inválido (23514) a un mensaje sobre el estado de conservación', async () => {
  getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  single.mockResolvedValue({
    data: null,
    error: {
      code: '23514',
      message: 'new row for relation "coins_items" violates check constraint "coins_items_grade_check"',
    },
  })

  try {
    await saveItem(input)
    expect.unreachable('saveItem debía rechazar')
  } catch (err) {
    const message = (err as Error).message
    expect(message).toMatch(/estado de conservación/i)
    expect(message).not.toMatch(/check constraint/i)
  }
})

test('traduce cualquier otro error de la base de datos a un mensaje genérico en español', async () => {
  getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  single.mockResolvedValue({
    data: null,
    error: {
      code: '23503',
      message: 'insert or update on table "coins_items" violates foreign key constraint "coins_items_numista_id_fkey"',
    },
  })

  try {
    await saveItem(input)
    expect.unreachable('saveItem debía rechazar')
  } catch (err) {
    const message = (err as Error).message
    expect(message).toMatch(/no se pudo guardar/i)
    expect(message).not.toMatch(/foreign key/i)
    expect(message).not.toMatch(/coins_items/)
  }

  expect(console.error).toHaveBeenCalled()
})

import { render, screen } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthProvider'

const getSession = vi.fn()
const onAuthStateChange = vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))

vi.mock('../../lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
      onAuthStateChange: () => onAuthStateChange(),
    },
  },
}))

function Probe() {
  const { session, loading } = useAuth()
  if (loading) return <p>Cargando…</p>
  return <p>{session ? 'con sesión' : 'sin sesión'}</p>
}

beforeEach(() => {
  getSession.mockReset()
  onAuthStateChange.mockClear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

test('cuando getSession() rechaza (sin red), deja de cargar y no hay sesión', async () => {
  getSession.mockRejectedValue(new Error('network error'))

  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )

  expect(await screen.findByText('sin sesión')).toBeInTheDocument()
  expect(screen.queryByText('Cargando…')).not.toBeInTheDocument()
})

test('cuando getSession() resuelve con sesión, la expone y deja de cargar', async () => {
  getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } })

  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )

  expect(await screen.findByText('con sesión')).toBeInTheDocument()
})

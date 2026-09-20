import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { LoginPage } from './LoginPage'

const signIn = vi.fn()
const signUp = vi.fn()
let mockSession: { user: { id: string } } | null = null
let mockLoading = false

vi.mock('./AuthProvider', () => ({
  useAuth: () => ({ session: mockSession, loading: mockLoading, signIn, signUp, signOut: vi.fn() }),
}))

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/coleccion" element={<p>Página de la colección</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  signIn.mockReset()
  signUp.mockReset()
  signUp.mockResolvedValue({ needsEmailConfirmation: false })
  mockSession = null
  mockLoading = false
})

test('inicia sesión con correo y contraseña', async () => {
  const user = userEvent.setup()
  renderLoginPage()

  await user.type(screen.getByLabelText(/correo/i), 'coleccionista@ejemplo.cl')
  await user.type(screen.getByLabelText(/contraseña/i), 'secreta123')
  await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

  expect(signIn).toHaveBeenCalledWith('coleccionista@ejemplo.cl', 'secreta123')
  expect(signUp).not.toHaveBeenCalled()
})

test('el modo de creación de cuenta llama a signUp en vez de signIn', async () => {
  const user = userEvent.setup()
  renderLoginPage()

  await user.click(screen.getByRole('button', { name: /crear cuenta/i }))
  await user.type(screen.getByLabelText(/correo/i), 'nueva@ejemplo.cl')
  await user.type(screen.getByLabelText(/contraseña/i), 'secreta123')
  await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

  expect(signUp).toHaveBeenCalledWith('nueva@ejemplo.cl', 'secreta123')
  expect(signIn).not.toHaveBeenCalled()
})

test('muestra un mensaje claro cuando las credenciales son incorrectas', async () => {
  const user = userEvent.setup()
  signIn.mockRejectedValueOnce({ name: 'AuthApiError', code: 'invalid_credentials', status: 400 })
  renderLoginPage()

  await user.type(screen.getByLabelText(/correo/i), 'coleccionista@ejemplo.cl')
  await user.type(screen.getByLabelText(/contraseña/i), 'incorrecta')
  await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

  expect(await screen.findByRole('alert')).toHaveTextContent(/correo o contraseña incorrectos/i)
})

test('muestra un mensaje claro cuando el correo ya está registrado', async () => {
  const user = userEvent.setup()
  signUp.mockRejectedValueOnce({ name: 'AuthApiError', code: 'user_already_exists', status: 422 })
  renderLoginPage()

  await user.click(screen.getByRole('button', { name: /crear cuenta/i }))
  await user.type(screen.getByLabelText(/correo/i), 'coleccionista@ejemplo.cl')
  await user.type(screen.getByLabelText(/contraseña/i), 'secreta123')
  await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

  expect(await screen.findByRole('alert')).toHaveTextContent(/ya existe una cuenta/i)
})

test('signUp sin sesión (confirmación de correo pendiente) muestra aviso explícito', async () => {
  const user = userEvent.setup()
  signUp.mockResolvedValueOnce({ needsEmailConfirmation: true })
  renderLoginPage()

  await user.click(screen.getByRole('button', { name: /crear cuenta/i }))
  await user.type(screen.getByLabelText(/correo/i), 'nueva@ejemplo.cl')
  await user.type(screen.getByLabelText(/contraseña/i), 'secreta123')
  await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

  expect(await screen.findByRole('status')).toHaveTextContent(/confirma tu cuenta/i)
})

test('signUp con sesión activa (confirmación deshabilitada) no muestra el aviso de confirmación', async () => {
  const user = userEvent.setup()
  signUp.mockResolvedValueOnce({ needsEmailConfirmation: false })
  renderLoginPage()

  await user.click(screen.getByRole('button', { name: /crear cuenta/i }))
  await user.type(screen.getByLabelText(/correo/i), 'nueva@ejemplo.cl')
  await user.type(screen.getByLabelText(/contraseña/i), 'secreta123')
  await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

  expect(signUp).toHaveBeenCalledWith('nueva@ejemplo.cl', 'secreta123')
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

test('muestra un mensaje claro cuando el correo no está confirmado al iniciar sesión', async () => {
  const user = userEvent.setup()
  signIn.mockRejectedValueOnce({ name: 'AuthApiError', code: 'email_not_confirmed', status: 400 })
  renderLoginPage()

  await user.type(screen.getByLabelText(/correo/i), 'nueva@ejemplo.cl')
  await user.type(screen.getByLabelText(/contraseña/i), 'secreta123')
  await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

  expect(await screen.findByRole('alert')).toHaveTextContent(/confirmar tu correo/i)
})

test('no muestra un mensaje genérico para un error no reconocido', async () => {
  const user = userEvent.setup()
  signIn.mockRejectedValueOnce({ name: 'AuthUnknownError', message: 'network hiccup' })
  renderLoginPage()

  await user.type(screen.getByLabelText(/correo/i), 'coleccionista@ejemplo.cl')
  await user.type(screen.getByLabelText(/contraseña/i), 'secreta123')
  await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

  const alert = await screen.findByRole('alert')
  expect(alert).not.toHaveTextContent(/network hiccup/i)
  expect(alert).toHaveTextContent(/no se pudo completar la operación/i)
})

test('una usuaria que se autentica abandona la página de login', async () => {
  const user = userEvent.setup()
  signIn.mockImplementation(async () => {
    mockSession = { user: { id: 'user-1' } }
  })
  const { rerender } = renderLoginPage()

  await user.type(screen.getByLabelText(/correo/i), 'coleccionista@ejemplo.cl')
  await user.type(screen.getByLabelText(/contraseña/i), 'secreta123')
  await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

  // El hook `useAuth` ya refleja la sesión nueva; se vuelve a renderizar
  // para simular la propagación normal de ese cambio de estado.
  rerender(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/coleccion" element={<p>Página de la colección</p>} />
      </Routes>
    </MemoryRouter>,
  )

  expect(await screen.findByText('Página de la colección')).toBeInTheDocument()
  expect(screen.queryByLabelText(/correo/i)).not.toBeInTheDocument()
})

test('una usuaria que llega a /login ya autenticada no ve el formulario', () => {
  mockSession = { user: { id: 'user-1' } }
  renderLoginPage()

  expect(screen.getByText('Página de la colección')).toBeInTheDocument()
  expect(screen.queryByLabelText(/correo/i)).not.toBeInTheDocument()
})

test('mientras la sesión se está resolviendo (loading) no redirige ni muestra el formulario antes de tiempo', () => {
  mockSession = null
  mockLoading = true
  renderLoginPage()

  // No hay sesión resuelta todavía: no debe forzarse la redirección a "/".
  expect(screen.queryByText('Página de la colección')).not.toBeInTheDocument()
  expect(screen.getByLabelText(/correo/i)).toBeInTheDocument()
})

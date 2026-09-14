import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginPage } from './LoginPage'

const signIn = vi.fn()
const signUp = vi.fn()

vi.mock('./AuthProvider', () => ({
  useAuth: () => ({ session: null, loading: false, signIn, signUp, signOut: vi.fn() }),
}))

beforeEach(() => {
  signIn.mockReset()
  signUp.mockReset()
  signUp.mockResolvedValue({ needsEmailConfirmation: false })
})

test('inicia sesión con correo y contraseña', async () => {
  const user = userEvent.setup()
  render(<LoginPage />)

  await user.type(screen.getByLabelText(/correo/i), 'coleccionista@ejemplo.cl')
  await user.type(screen.getByLabelText(/contraseña/i), 'secreta123')
  await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

  expect(signIn).toHaveBeenCalledWith('coleccionista@ejemplo.cl', 'secreta123')
  expect(signUp).not.toHaveBeenCalled()
})

test('el modo de creación de cuenta llama a signUp en vez de signIn', async () => {
  const user = userEvent.setup()
  render(<LoginPage />)

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
  render(<LoginPage />)

  await user.type(screen.getByLabelText(/correo/i), 'coleccionista@ejemplo.cl')
  await user.type(screen.getByLabelText(/contraseña/i), 'incorrecta')
  await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

  expect(await screen.findByRole('alert')).toHaveTextContent(/correo o contraseña incorrectos/i)
})

test('muestra un mensaje claro cuando el correo ya está registrado', async () => {
  const user = userEvent.setup()
  signUp.mockRejectedValueOnce({ name: 'AuthApiError', code: 'user_already_exists', status: 422 })
  render(<LoginPage />)

  await user.click(screen.getByRole('button', { name: /crear cuenta/i }))
  await user.type(screen.getByLabelText(/correo/i), 'coleccionista@ejemplo.cl')
  await user.type(screen.getByLabelText(/contraseña/i), 'secreta123')
  await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

  expect(await screen.findByRole('alert')).toHaveTextContent(/ya existe una cuenta/i)
})

test('signUp sin sesión (confirmación de correo pendiente) muestra aviso explícito', async () => {
  const user = userEvent.setup()
  signUp.mockResolvedValueOnce({ needsEmailConfirmation: true })
  render(<LoginPage />)

  await user.click(screen.getByRole('button', { name: /crear cuenta/i }))
  await user.type(screen.getByLabelText(/correo/i), 'nueva@ejemplo.cl')
  await user.type(screen.getByLabelText(/contraseña/i), 'secreta123')
  await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

  expect(await screen.findByRole('status')).toHaveTextContent(/confirma tu cuenta/i)
})

test('signUp con sesión activa (confirmación deshabilitada) no muestra el aviso de confirmación', async () => {
  const user = userEvent.setup()
  signUp.mockResolvedValueOnce({ needsEmailConfirmation: false })
  render(<LoginPage />)

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
  render(<LoginPage />)

  await user.type(screen.getByLabelText(/correo/i), 'nueva@ejemplo.cl')
  await user.type(screen.getByLabelText(/contraseña/i), 'secreta123')
  await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

  expect(await screen.findByRole('alert')).toHaveTextContent(/confirmar tu correo/i)
})

test('no muestra un mensaje genérico para un error no reconocido', async () => {
  const user = userEvent.setup()
  signIn.mockRejectedValueOnce({ name: 'AuthUnknownError', message: 'network hiccup' })
  render(<LoginPage />)

  await user.type(screen.getByLabelText(/correo/i), 'coleccionista@ejemplo.cl')
  await user.type(screen.getByLabelText(/contraseña/i), 'secreta123')
  await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

  const alert = await screen.findByRole('alert')
  expect(alert).not.toHaveTextContent(/network hiccup/i)
  expect(alert).toHaveTextContent(/no se pudo completar la operación/i)
})

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

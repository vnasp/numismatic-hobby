import { useState, type FormEvent } from 'react'
import { useAuth } from './AuthProvider'

export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await signIn(email)
      setSent(true)
    } catch {
      setError('No se pudo enviar el enlace. Revisa el correo e inténtalo otra vez.')
    }
  }

  return (
    <main>
      <h1>Mi Colección de Monedas</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Enviar enlace de acceso</button>
      </form>
      {sent && <p role="status">Revisa tu correo: te enviamos un enlace para entrar.</p>}
      {error && <p role="alert">{error}</p>}
    </main>
  )
}

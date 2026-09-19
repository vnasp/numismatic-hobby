import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

type Mode = 'signIn' | 'signUp'

interface AuthErrorLike {
  code?: string
  status?: number
  message?: string
}

function isAuthErrorLike(error: unknown): error is AuthErrorLike {
  return typeof error === 'object' && error !== null
}

/**
 * Traduce los errores de `supabase.auth` a mensajes en español.
 *
 * Se prioriza `error.code` (los valores vienen de `@supabase/auth-js`,
 * ver `ErrorCode` en `node_modules/@supabase/auth-js/src/lib/error-codes.ts`
 * y las clases en `node_modules/@supabase/auth-js/src/lib/errors.ts`)
 * porque es estable entre versiones, a diferencia del `message` en inglés.
 */
function mapAuthError(error: unknown): string {
  const code = isAuthErrorLike(error) ? error.code : undefined

  switch (code) {
    case 'invalid_credentials':
      return 'Correo o contraseña incorrectos.'
    case 'user_already_exists':
    case 'email_exists':
      return 'Ya existe una cuenta con este correo. Inicia sesión en su lugar.'
    case 'weak_password':
      return 'La contraseña es muy corta o débil. Usa al menos 6 caracteres.'
    case 'email_not_confirmed':
      return 'Debes confirmar tu correo antes de iniciar sesión.'
    case 'email_address_invalid':
      return 'El correo electrónico no es válido.'
    case 'over_email_send_rate_limit':
      return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
    case 'signup_disabled':
      return 'El registro de cuentas está deshabilitado.'
    case 'same_password':
      return 'La nueva contraseña debe ser distinta de la actual.'
    case 'validation_failed':
      return 'Revisa los datos ingresados.'
    default:
      return 'No se pudo completar la operación. Inténtalo de nuevo.'
  }
}

export function LoginPage() {
  const { session, loading, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isSignUp = mode === 'signUp'

  // Ya hay una sesión activa (login recién exitoso, o se llegó a /login estando
  // ya autenticada): no hay nada que hacer aquí. Se espera a que `loading`
  // resuelva para no redirigir antes de saber si hay sesión.
  if (!loading && session) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)
    try {
      if (isSignUp) {
        const result = await signUp(email, password)
        if (result.needsEmailConfirmation) {
          setInfo(
            'Creamos tu cuenta. Revisa tu correo y confirma tu cuenta antes de iniciar sesión.'
          )
        }
        // Si no necesita confirmación, Supabase ya dejó la sesión activa: el
        // chequeo de `session` al inicio de este componente se encarga de
        // sacar a la usuaria de /login.
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      setError(mapAuthError(err))
    } finally {
      setSubmitting(false)
    }
  }

  function toggleMode() {
    setMode((m) => (m === 'signIn' ? 'signUp' : 'signIn'))
    setError(null)
    setInfo(null)
  }

  return (
    <div className="app">
      <main className="auth">
        <div className="auth__brand">
          <h1>Mi Colección de Monedas</h1>
          <p className="auth__tagline">
            Tu vitrina personal, catalogada por número KM.
          </p>
        </div>

        <form className="form card" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label" htmlFor="email">
              Correo electrónico
            </label>
            <input
              className="input"
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="password">
              Contraseña
            </label>
            <input
              className="input"
              id="password"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="auth__switch">
          <button type="button" className="link-btn" onClick={toggleMode}>
            {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Crear cuenta'}
          </button>
        </p>

        {info && (
          <p className="alert alert--info" role="status">
            {info}
          </p>
        )}
        {error && (
          <p className="alert alert--error" role="alert">
            {error}
          </p>
        )}
      </main>
    </div>
  )
}

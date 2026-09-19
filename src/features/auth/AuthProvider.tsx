import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase/client'

export interface SignUpResult {
  /** true si Supabase creó la cuenta pero aún no hay sesión activa: el proyecto
   * tiene "Confirm email" habilitado y el usuario debe confirmar desde su correo
   * antes de poder iniciar sesión. */
  needsEmailConfirmation: boolean
}

interface AuthValue {
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<SignUpResult>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session)
        setLoading(false)
      })
      .catch((err) => {
        // Sin red, DNS caído, etc.: se resuelve como "sin sesión" para que la
        // usuaria llegue a /login en vez de quedarse en "Cargando…" para siempre.
        console.error('AuthProvider: getSession falló', err)
        setSession(null)
        setLoading(false)
      })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email: string, password: string): Promise<SignUpResult> {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    // `signUp` does NOT throw when email confirmation is enabled on the project:
    // it resolves successfully with a user but `data.session === null` until the
    // user confirms via the link in their email. Callers need this to tell the
    // two outcomes apart.
    return { needsEmailConfirmation: data.session === null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}

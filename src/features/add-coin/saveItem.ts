import { supabase } from '../../lib/supabase/client'
import type { GradeCode } from '../../lib/grades'

export interface SaveItemInput {
  numistaId: number
  numistaIssueId: number | null
  grade: GradeCode | null
  conditionNotes: string
  location: string
  notes: string
}

const SESSION_EXPIRED_MESSAGE =
  'Tu sesión expiró. Inicia sesión nuevamente y guarda de nuevo: lo que escribiste no se pierde.'

/**
 * Traduce el error de Postgres/PostgREST al insertar en `coins_items` a un
 * mensaje en español. Se prioriza `error.code` (el SQLSTATE, estable entre
 * versiones) sobre `error.message` (texto de Postgres en inglés, que nunca
 * debe llegar a la usuaria).
 */
function mapSaveError(error: { code?: string; message?: string }): string {
  switch (error.code) {
    // 42501 = insufficient_privilege: la política RLS rechazó la escritura.
    // En la práctica, esto ocurre cuando la sesión expiró entre que se abrió
    // el formulario y que se guardó.
    case '42501':
      return SESSION_EXPIRED_MESSAGE
    // 23514 = check_violation: por ejemplo un valor de `grade` fuera de la
    // escala permitida.
    case '23514':
      return 'No se pudo guardar la moneda: el estado de conservación no es válido.'
    default:
      return 'No se pudo guardar la moneda. Inténtalo de nuevo en unos minutos.'
  }
}

export async function saveItem(input: SaveItemInput): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error(SESSION_EXPIRED_MESSAGE)

  const { data, error } = await supabase
    .from('coins_items')
    .insert({
      owner_id: user.id,
      numista_id: input.numistaId,
      numista_issue_id: input.numistaIssueId,
      grade: input.grade,
      condition_notes: input.conditionNotes || null,
      location: input.location || null,
      notes: input.notes || null,
    })
    .select('id')
    .single()

  if (error) {
    // El detalle técnico (en inglés, con internals de Postgres) queda
    // disponible para depurar, pero nunca se muestra a la usuaria.
    console.error('saveItem: error al insertar en coins_items', error)
    throw new Error(mapSaveError(error))
  }

  return data.id as string
}

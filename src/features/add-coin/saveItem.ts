import { supabase } from '../../lib/supabase/client'
import type { GradeCode } from '../../lib/grades'
import { SESSION_EXPIRED_MESSAGE, mapPostgresError } from '../../lib/postgresErrorMessage'

export interface SaveItemInput {
  numistaId: number
  numistaIssueId: number | null
  grade: GradeCode | null
  conditionNotes: string
  location: string
  notes: string
}

/**
 * Traduce el error de Postgres/PostgREST al insertar en `coins_items` a un
 * mensaje en español, usando el mapeo compartido en `postgresErrorMessage`.
 */
function mapSaveError(error: { code?: string; message?: string }): string {
  return mapPostgresError(error, {
    codes: {
      // 23514 = check_violation: por ejemplo un valor de `grade` fuera de la
      // escala permitida.
      '23514': 'No se pudo guardar la moneda: el estado de conservación no es válido.',
    },
    fallback: 'No se pudo guardar la moneda. Inténtalo de nuevo en unos minutos.',
  })
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

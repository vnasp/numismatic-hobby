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

export async function saveItem(input: SaveItemInput): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa.')

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

  if (error) throw new Error(`No se pudo guardar la moneda: ${error.message}`)
  return data.id as string
}

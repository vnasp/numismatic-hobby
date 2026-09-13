import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import type { NumistaType, NumistaIssue } from '../../../shared/numista/types.ts'
import { extractKmNumber } from '../../../shared/numista/references.ts'

export async function readCachedType(
  db: SupabaseClient,
  typeId: number,
): Promise<{ type: NumistaType; issues: NumistaIssue[] } | null> {
  const { data: typeRow } = await db
    .from('coins_types')
    .select('raw')
    .eq('numista_id', typeId)
    .maybeSingle()

  if (!typeRow) return null

  const { data: issueRows } = await db
    .from('coins_issues')
    .select('raw')
    .eq('numista_id', typeId)

  const issues = (issueRows ?? []).map((r) => r.raw as NumistaIssue)

  // `writeCachedType` escribe coins_types y luego coins_issues por separado
  // (no es atómico). Si la segunda escritura falla, quedaría un type
  // cacheado con cero issues para siempre, indistinguible de un tipo que
  // genuinamente no tiene issues en Numista. Tratamos ese caso como cache
  // MISS: forzamos un re-fetch que se autorrepara escribiendo de nuevo.
  // Costo aceptado: un tipo con cero issues reales jamás "pega" en caché y
  // se re-consulta en cada getType; es preferible a servir para siempre una
  // lista vacía que en realidad es el síntoma de una escritura rota.
  if (issues.length === 0) return null

  return {
    type: typeRow.raw as NumistaType,
    issues,
  }
}

export async function writeCachedType(
  db: SupabaseClient,
  type: NumistaType,
  issues: NumistaIssue[],
): Promise<void> {
  const { error: typeError } = await db.from('coins_types').upsert({
    numista_id: type.id,
    title: type.title,
    issuer_code: type.issuer?.code ?? null,
    issuer_name: type.issuer?.name ?? null,
    min_year: type.min_year ?? null,
    max_year: type.max_year ?? null,
    composition_text: type.composition?.text ?? null,
    shape: type.shape ?? null,
    weight: type.weight ?? null,
    size: type.size ?? null,
    thickness: type.thickness ?? null,
    obverse_thumbnail: type.obverse?.thumbnail ?? null,
    obverse_picture: type.obverse?.picture ?? null,
    reverse_thumbnail: type.reverse?.thumbnail ?? null,
    reverse_picture: type.reverse?.picture ?? null,
    km_number: extractKmNumber(type.references),
    raw: type,
    fetched_at: new Date().toISOString(),
  })
  if (typeError) {
    throw new Error(`No se pudo cachear coins_types: ${typeError.message}`)
  }

  if (issues.length === 0) return

  const { error: issuesError } = await db.from('coins_issues').upsert(
    issues.map((issue) => ({
      numista_issue_id: issue.id,
      numista_id: type.id,
      year: issue.year ?? null,
      gregorian_year: issue.gregorian_year ?? null,
      mint_letter: issue.mint_letter ?? null,
      mintage: issue.mintage ?? null,
      comment: issue.comment ?? null,
      km_number: extractKmNumber(issue.references),
      raw: issue,
      fetched_at: new Date().toISOString(),
    })),
  )
  if (issuesError) {
    throw new Error(`No se pudo cachear coins_issues: ${issuesError.message}`)
  }
}

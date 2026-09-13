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

  return {
    type: typeRow.raw as NumistaType,
    issues: (issueRows ?? []).map((r) => r.raw as NumistaIssue),
  }
}

export async function writeCachedType(
  db: SupabaseClient,
  type: NumistaType,
  issues: NumistaIssue[],
): Promise<void> {
  await db.from('coins_types').upsert({
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

  if (issues.length === 0) return

  await db.from('coins_issues').upsert(
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
}

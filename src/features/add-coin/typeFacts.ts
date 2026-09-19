import type { NumistaIssue, NumistaType } from '../../../shared/numista/types'
import { formatReference, preferredReference } from '../../../shared/numista/references'

/** Decimales con coma, como corresponde en español: 2,5 g y no 2.5 g. */
function formatNumber(value: number): string {
  return value.toLocaleString('es', { maximumFractionDigits: 2 })
}

/**
 * Datos físicos de la moneda para mostrar como distintivos: composición,
 * diámetro y peso. Se omite el que Numista no traiga en vez de dejar un
 * distintivo vacío o con un guión.
 */
export function typeFacts(type: NumistaType): string[] {
  const facts: string[] = []
  if (type.composition?.text) facts.push(type.composition.text)
  if (type.size) facts.push(`${formatNumber(type.size)} mm`)
  if (type.weight) facts.push(`${formatNumber(type.weight)} g`)
  return facts
}

/** Rango de años de acuñación del tipo: "1962 – 1963", o sólo "1962". */
export function typeYears(type: NumistaType): string | null {
  if (!type.min_year) return null
  if (!type.max_year || type.max_year === type.min_year) return `${type.min_year}`
  return `${type.min_year} – ${type.max_year}`
}

/**
 * Descripción de una emisión: año, ceca, tirada, KM (o Y#) propio y comentario, lo
 * que haya. Se usa igual en el selector del paso 1 y en la confirmación, así
 * que vive aquí y no dentro de un componente.
 */
export function issueLabel(issue: NumistaIssue): string {
  const parts: string[] = [issue.year ? `${issue.year}` : 'Sin fecha']
  if (issue.mint_letter) parts.push(`Ceca ${issue.mint_letter}`)
  if (issue.mintage) parts.push(`Tirada ${issue.mintage.toLocaleString('es')}`)

  const reference = preferredReference(issue.references)
  if (reference) parts.push(formatReference(reference))
  if (issue.comment) parts.push(issue.comment)

  return parts.join(' · ')
}

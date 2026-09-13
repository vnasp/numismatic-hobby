import type { NumistaReference } from './types'

/** ID del catálogo Krause (KM) en Numista. */
export const KM_CATALOGUE_ID = 3

export function extractCatalogueNumber(
  references: NumistaReference[] | undefined,
  catalogueId: number,
): string | null {
  const match = references?.find((ref) => ref.catalogue?.id === catalogueId)
  return match?.number ?? null
}

export function extractKmNumber(
  references: NumistaReference[] | undefined,
): string | null {
  return extractCatalogueNumber(references, KM_CATALOGUE_ID)
}

import type { NumistaReference } from './types.ts'

/** ID del catálogo Krause (KM) en Numista. */
export const KM_CATALOGUE_ID = 3

/**
 * ID del catálogo Yeoman (Y#) en Numista: *Modern & Current World Coins*.
 * Algunos países, como Venezuela, están referenciados sólo por Yeoman y no
 * tienen número KM, aunque el número suele coincidir con el que trae la
 * moneda anotada.
 */
export const Y_CATALOGUE_ID = 9

/** Catálogos por los que se busca, en orden de preferencia. */
export const SEARCH_CATALOGUES = { KM: KM_CATALOGUE_ID, Y: Y_CATALOGUE_ID } as const

export type CatalogueCode = keyof typeof SEARCH_CATALOGUES

export interface CatalogueReference {
  code: CatalogueCode
  number: string
}

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

/**
 * Referencia con la que identificar la moneda: el KM si existe en alguna de
 * las listas y, si no, el Y#. Las listas van de la más específica a la más
 * general (emisión antes que tipo), así que dentro de un mismo catálogo gana
 * la primera que lo traiga.
 */
export function preferredReference(
  ...lists: (NumistaReference[] | null | undefined)[]
): CatalogueReference | null {
  for (const code of Object.keys(SEARCH_CATALOGUES) as CatalogueCode[]) {
    for (const list of lists) {
      const number = extractCatalogueNumber(list ?? undefined, SEARCH_CATALOGUES[code])
      if (number) return { code, number }
    }
  }
  return null
}

/** "KM #216" o "Y #42", con la misma forma en toda la app. */
export function formatReference(reference: CatalogueReference): string {
  return `${reference.code} #${reference.number}`
}

/**
 * Números de KM con los que intentar la búsqueda, en orden de preferencia.
 *
 * Krause usa el sufijo con punto (`186.2`, `216.1`) para variantes, pero
 * Numista las registra en dos lugares distintos según la moneda, y no hay
 * forma de saber cuál desde el número:
 *
 * - A veces la variante vive en la **emisión** y el tipo se referencia con el
 *   número base. Es el caso del 10 Pesos chileno: el tipo es `216` y buscar
 *   `216.1` no devuelve nada.
 * - A veces la variante vive en el **tipo**. Es el caso del 1 Colón de Costa
 *   Rica (N#7666), referenciado como `KM# 186.2-186.4`: ahí no existe un
 *   `186` a secas y recortar el sufijo hace que la moneda sea inencontrable.
 *
 * Por eso se devuelven ambos candidatos y quien busca prueba el primero y
 * recurre al segundo sólo si no hubo resultados. Elegir uno de antemano deja
 * fuera a la mitad del catálogo.
 *
 * El sufijo con letra (`179a`) identifica un tipo distinto en el propio
 * Krause y nunca se recorta.
 */
export function kmSearchCandidates(km: string): string[] {
  const trimmed = km.trim()
  const base = trimmed.replace(/\.\d.*$/, '')
  // `base` queda vacío si lo escrito era sólo el sufijo (".1"): en ese caso
  // el único candidato es lo tecleado, y que la búsqueda no encuentre nada.
  if (!base || base === trimmed) return [trimmed]
  return [trimmed, base]
}

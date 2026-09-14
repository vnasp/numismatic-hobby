/**
 * Normaliza texto para comparaciones de busqueda insensibles a
 * mayusculas/minusculas y a acentos: "Peru" y "peru" deben producir el mismo
 * resultado. Se usa tanto al cachear `coins_regions.issuer_name_normalized`
 * (Edge Function) como al construir el filtro `ilike` del autocompletado de
 * pais (navegador), asi que vive en `shared/` para que ambos lados apliquen
 * exactamente la misma transformacion.
 *
 * No depende de la extension `unaccent` de Postgres: separar y quitar los
 * diacriticos ocurre en JavaScript con `String.prototype.normalize('NFD')`
 * mas un reemplazo de los caracteres combinantes (rango Unicode U+0300 a
 * U+036F), disponible tanto en Deno como en los navegadores modernos.
 */
const COMBINING_DIACRITICS = /[\u0300-\u036f]/g

export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .toLowerCase()
    .trim()
}

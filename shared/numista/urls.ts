/**
 * Página pública de un tipo en el catálogo de Numista.
 *
 * `GET /types/{id}` devuelve el campo `url` ya armado, y como el proxy consulta
 * la API con `lang=es` viene apuntando al catálogo en español. El listado de
 * búsqueda (`GET /types`) en cambio **no** incluye `url` —sólo `id`, ver el
 * esquema del 200 de `/types` en swagger.yaml—, así que para esos resultados se
 * arma con el patrón del catálogo sobre el subdominio español.
 */
const NUMISTA_ES = 'https://es.numista.com'

export function numistaTypeUrl(type: { id: number; url?: string }): string {
  return type.url ?? `${NUMISTA_ES}/${type.id}`
}

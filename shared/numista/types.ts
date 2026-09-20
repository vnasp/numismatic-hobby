export interface NumistaReference {
  catalogue: { id: number; code: string }
  number: string
}

export interface NumistaSide {
  description?: string
  lettering?: string
  picture?: string
  thumbnail?: string
}

export interface NumistaType {
  id: number
  url?: string
  title: string
  issuer?: { code: string; name: string }
  min_year?: number
  max_year?: number
  shape?: string
  composition?: { text?: string }
  obverse?: NumistaSide
  reverse?: NumistaSide
  references?: NumistaReference[]
  weight?: number
  size?: number
  thickness?: number
  category?: string
  type?: string
}

/**
 * Tipo de objeto: moneda de circulación, conmemorativa, patrón, ficha…
 *
 * En la respuesta el `id` viene como string aunque el parámetro de búsqueda
 * sea entero; así lo declara la spec y así conviene tipearlo.
 */
export interface NumistaObjectType {
  id: string
  name: string
}

/**
 * Item de la lista devuelta por `GET /types` (búsqueda). A diferencia de
 * `NumistaType` (la respuesta de `GET /types/{id}`), aquí las miniaturas
 * vienen en campos planos (`obverse_thumbnail` / `reverse_thumbnail`) y NO
 * hay `references`: ver el esquema del 200 de `/types` en swagger.yaml.
 *
 * Esa ausencia es la que obliga a recorrer el catálogo en dos fases cuando
 * se quiere armar una lista por número KM: primero el listado, y después
 * una llamada por tipo para saber qué número le toca.
 */
export interface NumistaSearchResultType {
  id: number
  title: string
  object_type?: NumistaObjectType
  issuer?: { code: string; name: string }
  min_year?: number
  max_year?: number
  obverse_thumbnail?: string
  reverse_thumbnail?: string
  category?: string
}

export interface NumistaIssue {
  id: number
  is_dated?: boolean
  year?: number
  gregorian_year?: number
  mint_letter?: string
  mintage?: number
  comment?: string
  references?: NumistaReference[]
}

export interface NumistaSearchResult {
  count: number
  types: NumistaSearchResultType[]
}

/** Item de la lista devuelta por `GET /issuers`. Ver swagger.yaml. */
export interface NumistaIssuer {
  code: string
  name: string
  flag?: string
  parent?: { code: string; name: string }
  level?: number
}

export interface NumistaIssuersResult {
  count: number
  issuers: NumistaIssuer[]
}

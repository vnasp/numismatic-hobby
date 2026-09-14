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
 * Item de la lista devuelta por `GET /types` (búsqueda). A diferencia de
 * `NumistaType` (la respuesta de `GET /types/{id}`), aquí las miniaturas
 * vienen en campos planos (`obverse_thumbnail` / `reverse_thumbnail`) y NO
 * hay `references`: ver el esquema del 200 de `/types` en swagger.yaml.
 */
export interface NumistaSearchResultType {
  id: number
  title: string
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
  wikidata_id?: string
  parent?: { code: string; name: string }
  level?: number
}

export interface NumistaIssuersResult {
  count: number
  issuers: NumistaIssuer[]
}

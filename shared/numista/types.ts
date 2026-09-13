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
  types: NumistaType[]
}

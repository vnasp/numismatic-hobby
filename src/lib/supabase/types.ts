import type { GradeCode } from '../grades'

export interface CoinItem {
  id: string
  numista_id: number
  numista_issue_id: number | null
  grade: GradeCode | null
  condition_notes: string | null
  location: string | null
  notes: string | null
  created_at: string
}

export interface CoinType {
  numista_id: number
  title: string
  issuer_code: string | null
  issuer_name: string | null
  min_year: number | null
  max_year: number | null
  km_number: string | null
  obverse_thumbnail: string | null
  reverse_thumbnail: string | null
}

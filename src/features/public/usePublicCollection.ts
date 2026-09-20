import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/client'
import { preferredReference } from '../../../shared/numista/references'
import type { NumistaReference } from '../../../shared/numista/types'
import type { GradeCode } from '../../lib/grades'
import type { CollectionEntry } from '../collection/useCollection'

interface Row {
  id: string
  grade: GradeCode | null
  numista_id: number
  numista_issue_id: number | null
  title: string
  issuer_code: string | null
  issuer_name: string | null
  composition_text: string | null
  weight: number | null
  size: number | null
  obverse_thumbnail: string | null
  reverse_thumbnail: string | null
  issue_year: number | null
  issue_gregorian_year: number | null
  mint_letter: string | null
  continent: string | null
  type_refs: NumistaReference[] | null
  issue_refs: NumistaReference[] | null
}

/**
 * La colección tal como la ve cualquiera, sin sesión.
 *
 * Lee `coins_public_items`, la vista que el rol anónimo tiene permitido
 * consultar. Lo que no está en esa vista no se puede pedir: la ubicación, las
 * notas y la valoración no existen ahí, así que la privacidad no depende de
 * que esta pantalla se acuerde de no mostrarlas.
 *
 * Devuelve el mismo `CollectionEntry` que la vista privada para poder
 * reutilizar la tarjeta y los filtros; lo que la vista pública no trae queda
 * en su valor neutro.
 *
 * `enabled: false` la deja sin disparar: en `/stats`, que sirve a las dos
 * mitades, se apaga la consulta que no corresponde a la sesión.
 */
export function usePublicCollection({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    enabled,
    queryKey: ['public-collection'],
    queryFn: async (): Promise<CollectionEntry[]> => {
      const { data, error } = await supabase
        .from('coins_public_items')
        .select(
          `
          id, grade, numista_id, numista_issue_id, title,
          issuer_code, issuer_name, composition_text, weight, size,
          obverse_thumbnail, reverse_thumbnail,
          issue_year, issue_gregorian_year, mint_letter, continent,
          type_refs, issue_refs
        `,
        )
        .order('created_at', { ascending: false })

      if (error) {
        console.error('usePublicCollection: error al leer coins_public_items', error)
        throw new Error('No se pudo cargar la colección. Inténtalo de nuevo en unos minutos.')
      }

      return (data as unknown as Row[]).map((row) => ({
        id: row.id,
        numistaId: row.numista_id,
        numistaIssueId: row.numista_issue_id,
        grade: row.grade,
        title: row.title,
        issuerCode: row.issuer_code,
        issuerName: row.issuer_name,
        continent: row.continent,
        reference: preferredReference(row.issue_refs, row.type_refs),
        issueYear: row.issue_year,
        gregorianYear: row.issue_gregorian_year ?? row.issue_year,
        mintLetter: row.mint_letter,
        thumbnail: row.reverse_thumbnail ?? row.obverse_thumbnail,
        thumbnailBack: row.reverse_thumbnail ? row.obverse_thumbnail : null,
        material: row.composition_text,
        diameterMm: row.size,
        weightG: row.weight,
        // La vista pública no expone ni la valoración ni los favoritos.
        value: null,
        isFavorite: false,
      }))
    },
  })
}

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/client'
import type { GradeCode } from '../../lib/grades'
import { mapPostgresError } from '../../lib/postgresErrorMessage'
import {
  preferredReference,
  type CatalogueReference,
} from '../../../shared/numista/references'
import type { NumistaReference } from '../../../shared/numista/types'

export interface CoinValue {
  amount: number
  currency: string
  /** De dónde salió el número, si se anotó. */
  source: string | null
  /** Cuándo se anotó, en ISO. */
  at: string | null
}

export interface CollectionEntry {
  id: string
  /** Tipo del catálogo. Junto a `numistaIssueId` identifica al ejemplar. */
  numistaId: number
  numistaIssueId: number | null
  grade: GradeCode | null
  title: string
  issuerCode: string | null
  issuerName: string | null
  /** Continente del emisor según `coins_regions`, si está asignado. */
  continent: string | null
  /** KM de la moneda o, si no tiene, su número Yeoman (Y#). */
  reference: CatalogueReference | null
  issueYear: number | null
  thumbnail: string | null
  /** La otra cara, para mostrarla al pasar el puntero. Null si no hay foto. */
  thumbnailBack: string | null
  /** Composición según Numista. Sirve para saber cómo limpiarla. */
  material: string | null
  /** Diámetro en mm (el `size` de Numista). Sirve para comprar cartones. */
  diameterMm: number | null
  /** Peso en gramos. */
  weightG: number | null
  /** Valoración anotada a mano, si la hay. */
  value: CoinValue | null
  isFavorite: boolean
}

interface Row {
  id: string
  numista_id: number
  numista_issue_id: number | null
  grade: GradeCode | null
  is_favorite: boolean
  estimated_value: number | null
  value_currency: string | null
  value_source: string | null
  valued_at: string | null
  coins_types: {
    title: string
    issuer_code: string | null
    issuer_name: string | null
    refs: NumistaReference[] | null
    composition_text: string | null
    size: number | null
    weight: number | null
    obverse_thumbnail: string | null
    reverse_thumbnail: string | null
  }
  coins_issues: { year: number | null; refs: NumistaReference[] | null } | null
}

export function useCollection() {
  return useQuery({
    queryKey: ['collection'],
    queryFn: async (): Promise<CollectionEntry[]> => {
      const { data, error } = await supabase
        .from('coins_items')
        .select(`
          id,
          numista_id,
          numista_issue_id,
          grade,
          is_favorite,
          estimated_value,
          value_currency,
          value_source,
          valued_at,
          coins_types (
            title, issuer_code, issuer_name, refs:raw->references,
            composition_text, size, weight,
            obverse_thumbnail, reverse_thumbnail
          ),
          coins_issues ( year, refs:raw->references )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        // El detalle técnico (en inglés, con internals de Postgres) queda
        // disponible para depurar, pero nunca se muestra a la usuaria.
        console.error('useCollection: error al leer coins_items', error)
        throw new Error(
          mapPostgresError(error, {
            fallback: 'No se pudo cargar la colección. Inténtalo de nuevo en unos minutos.',
          }),
        )
      }

      const rows = data as unknown as Row[]
      const continents = await readContinents(rows)

      return rows.map((row) => ({
        id: row.id,
        numistaId: row.numista_id,
        numistaIssueId: row.numista_issue_id,
        grade: row.grade,
        title: row.coins_types.title,
        issuerCode: row.coins_types.issuer_code,
        issuerName: row.coins_types.issuer_name,
        continent: continents.get(row.coins_types.issuer_code ?? '') ?? null,
        // Las referencias se leen de `raw` y no de `km_number` porque esa
        // columna sólo guarda KM, y hay países (Venezuela) que Numista sólo
        // referencia por Y#. La emisión va antes que el tipo: es más
        // específica cuando existe.
        reference: preferredReference(row.coins_issues?.refs, row.coins_types.refs),
        issueYear: row.coins_issues?.year ?? null,
        // Se muestra el reverso: en buena parte de las monedas es la cara
        // con el motivo distintivo, mientras el anverso repite el mismo busto
        // en toda una serie. Numista no siempre tiene foto de reverso, así
        // que se cae al anverso antes que dejar la ficha sin imagen.
        thumbnail: row.coins_types.reverse_thumbnail ?? row.coins_types.obverse_thumbnail,
        // La otra cara sólo existe cuando Numista tiene las dos fotos: si el
        // reverso faltó, la de adelante ya es el anverso y no hay vuelta.
        thumbnailBack: row.coins_types.reverse_thumbnail
          ? row.coins_types.obverse_thumbnail
          : null,
        material: row.coins_types.composition_text,
        // En Numista `size` es el diámetro cuando la moneda es redonda, y la
        // dimensión mayor cuando no lo es.
        diameterMm: row.coins_types.size,
        weightG: row.coins_types.weight,
        value:
          row.estimated_value == null
            ? null
            : {
                amount: row.estimated_value,
                currency: row.value_currency ?? 'CLP',
                source: row.value_source,
                at: row.valued_at,
              },
        isFavorite: row.is_favorite,
      }))
    },
  })
}

/**
 * Continente de cada emisor presente en la colección.
 *
 * Va en una consulta aparte porque `coins_regions` no tiene clave foránea
 * desde `coins_types`, así que PostgREST no puede incrustarla. Se piden sólo
 * los emisores de la colección, no los ~10.000 de la tabla.
 *
 * Si falla, la colección se muestra igual, sin continentes: es un dato para
 * filtrar, no para ver las monedas.
 */
async function readContinents(rows: Row[]): Promise<Map<string, string>> {
  const codes = [
    ...new Set(rows.map((row) => row.coins_types.issuer_code).filter((code): code is string => !!code)),
  ]
  if (codes.length === 0) return new Map()

  const { data, error } = await supabase
    .from('coins_regions')
    .select('issuer_code, continent')
    .in('issuer_code', codes)

  if (error) {
    console.error('useCollection: error al leer coins_regions', error)
    return new Map()
  }

  return new Map(
    (data as { issuer_code: string; continent: string | null }[])
      .filter((region) => region.continent)
      .map((region) => [region.issuer_code, region.continent as string]),
  )
}

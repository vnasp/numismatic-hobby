import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/client'
import type { GradeCode } from '../../lib/grades'
import { mapPostgresError } from '../../lib/postgresErrorMessage'

export interface CollectionEntry {
  id: string
  grade: GradeCode | null
  title: string
  issuerName: string | null
  kmNumber: string | null
  issueYear: number | null
  thumbnail: string | null
}

interface Row {
  id: string
  grade: GradeCode | null
  coins_types: {
    title: string
    issuer_name: string | null
    km_number: string | null
    obverse_thumbnail: string | null
  }
  coins_issues: { year: number | null; km_number: string | null } | null
}

export function useCollection() {
  return useQuery({
    queryKey: ['collection'],
    queryFn: async (): Promise<CollectionEntry[]> => {
      const { data, error } = await supabase
        .from('coins_items')
        .select(`
          id,
          grade,
          coins_types ( title, issuer_name, km_number, obverse_thumbnail ),
          coins_issues ( year, km_number )
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

      return (data as unknown as Row[]).map((row) => ({
        id: row.id,
        grade: row.grade,
        title: row.coins_types.title,
        issuerName: row.coins_types.issuer_name,
        // El KM de la emisión es más específico que el del tipo cuando existe.
        kmNumber: row.coins_issues?.km_number ?? row.coins_types.km_number,
        issueYear: row.coins_issues?.year ?? null,
        thumbnail: row.coins_types.obverse_thumbnail,
      }))
    },
  })
}

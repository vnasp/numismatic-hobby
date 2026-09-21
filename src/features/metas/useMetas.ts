import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/client'

export interface MetaSummary {
  slug: string
  name: string
  issuerCode: string
}

/**
 * Las metas definidas, para poder llegar a ellas.
 *
 * Sólo el encabezado: el avance de cada una exige cruzar su universo con
 * la colección, y hacerlo para todas en la pantalla de países sería traer
 * cientos de filas para pintar un subtítulo.
 */
export function useMetas() {
  return useQuery({
    queryKey: ['metas'],
    queryFn: async (): Promise<MetaSummary[]> => {
      const { data, error } = await supabase
        .from('coins_metas')
        .select('slug, name, issuer_code')
        .order('name')

      if (error) {
        console.error('useMetas: error al leer coins_metas', error)
        return []
      }

      return (data ?? []).map((row) => ({
        slug: row.slug as string,
        name: row.name as string,
        issuerCode: row.issuer_code as string,
      }))
    },
  })
}

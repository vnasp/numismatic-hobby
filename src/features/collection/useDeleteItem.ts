import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/client'
import { mapPostgresError } from '../../lib/postgresErrorMessage'
import type { CollectionEntry } from './useCollection'

/**
 * Borra un ejemplar de la colección.
 *
 * Es un borrado de verdad, no una marca: `coins_photos` cae con él por la
 * clave foránea en cascada. El catálogo (`coins_types`, `coins_issues`) no se
 * toca, porque es caché compartida y volver a agregar la misma moneda no debe
 * gastar cuota de Numista otra vez.
 *
 * El cambio es optimista: la ficha desaparece de la grilla antes de que
 * Postgres conteste, y vuelve a su lugar si la escritura falla.
 */
export function useDeleteItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coins_items').delete().eq('id', id)

      if (error) {
        // El detalle técnico queda para depurar, nunca para la usuaria.
        console.error('useDeleteItem: error al borrar en coins_items', error)
        throw new Error(
          mapPostgresError(error, {
            fallback: 'No se pudo eliminar la moneda. Inténtalo de nuevo.',
          }),
        )
      }
    },

    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['collection'] })
      const previous = queryClient.getQueryData<CollectionEntry[]>(['collection'])

      queryClient.setQueryData<CollectionEntry[]>(['collection'], (old) =>
        old?.filter((entry) => entry.id !== id),
      )

      return { previous }
    },

    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['collection'], context.previous)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] })
    },
  })
}

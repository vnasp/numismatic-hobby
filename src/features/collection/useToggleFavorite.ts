import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/client'
import { mapPostgresError } from '../../lib/postgresErrorMessage'
import type { CollectionEntry } from './useCollection'

interface Variables {
  id: string
  isFavorite: boolean
}

/**
 * Marca o desmarca un ejemplar como favorito.
 *
 * La actualización es optimista: el corazón se pinta antes de que Postgres
 * responda, porque esperar el ida y vuelta por un gesto tan liviano se siente
 * roto. Si la escritura falla se restaura la colección tal como estaba y el
 * corazón vuelve a su estado anterior.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, isFavorite }: Variables) => {
      const { error } = await supabase
        .from('coins_items')
        .update({ is_favorite: isFavorite })
        .eq('id', id)

      if (error) {
        // El detalle técnico queda para depurar, nunca para la usuaria.
        console.error('useToggleFavorite: error al actualizar coins_items', error)
        throw new Error(
          mapPostgresError(error, {
            fallback: 'No se pudo cambiar el favorito. Inténtalo de nuevo.',
          }),
        )
      }
    },

    onMutate: async ({ id, isFavorite }: Variables) => {
      // Se cancela cualquier refetch en vuelo: si llegara después de pintar el
      // cambio optimista, lo sobrescribiría con el valor viejo del servidor.
      await queryClient.cancelQueries({ queryKey: ['collection'] })
      const previous = queryClient.getQueryData<CollectionEntry[]>(['collection'])

      queryClient.setQueryData<CollectionEntry[]>(['collection'], (old) =>
        old?.map((entry) => (entry.id === id ? { ...entry, isFavorite } : entry)),
      )

      return { previous }
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['collection'], context.previous)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] })
    },
  })
}

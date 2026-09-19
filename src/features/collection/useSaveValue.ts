import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/client'
import { mapPostgresError } from '../../lib/postgresErrorMessage'

export interface SaveValueInput {
  id: string
  /** Null borra la valoración anotada. */
  amount: number | null
  currency: string
}

/**
 * Guarda la valoración anotada a mano para un ejemplar.
 *
 * No es optimista: es un dato que se escribe de a poco y conviene que el
 * "Guardado" aparezca recién cuando Postgres confirmó, para no dar por buena
 * una cifra que no quedó.
 */
export function useSaveValue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, amount, currency }: SaveValueInput) => {
      const { error } = await supabase
        .from('coins_items')
        .update({
          estimated_value: amount,
          value_currency: amount == null ? null : currency,
          // Se pisa la procedencia: el número lo escribió la usuaria, ya no
          // viene de donde dijera la anotación anterior.
          value_source: amount == null ? null : 'Anotada a mano',
          valued_at: amount == null ? null : new Date().toISOString(),
        })
        .eq('id', id)

      if (error) {
        console.error('useSaveValue: error al actualizar coins_items', error)
        throw new Error(
          mapPostgresError(error, {
            fallback: 'No se pudo guardar la valoración. Inténtalo de nuevo.',
          }),
        )
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] })
    },
  })
}

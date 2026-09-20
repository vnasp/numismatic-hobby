import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/client'
import { mapPostgresError } from '../../lib/postgresErrorMessage'
import type { GradeCode } from '../../lib/grades'

export interface SaveItemInput {
  id: string
  /** Null deja la conservación sin especificar. */
  grade: GradeCode | null
  /** Null borra la valoración anotada. */
  amount: number | null
  currency: string
}

/**
 * Guarda lo que la usuaria puede corregir de un ejemplar: su estado de
 * conservación y su valoración.
 *
 * No es optimista: son datos que se escriben de a poco y conviene que el
 * "Guardado" aparezca recién cuando Postgres confirmó, para no dar por buena
 * una corrección que no quedó.
 */
export function useSaveItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, grade, amount, currency }: SaveItemInput) => {
      const { error } = await supabase
        .from('coins_items')
        .update({
          grade,
          estimated_value: amount,
          value_currency: amount == null ? null : currency,
          // Se pisa la procedencia: el número lo escribió la usuaria, ya no
          // viene de donde dijera la anotación anterior.
          value_source: amount == null ? null : 'Anotada a mano',
          valued_at: amount == null ? null : new Date().toISOString(),
        })
        .eq('id', id)

      if (error) {
        console.error('useSaveItem: error al actualizar coins_items', error)
        throw new Error(
          mapPostgresError(error, {
            fallback: 'No se pudieron guardar los cambios. Inténtalo de nuevo.',
          }),
        )
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] })
    },
  })
}

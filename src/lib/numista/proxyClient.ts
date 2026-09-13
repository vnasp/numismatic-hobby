import { supabase } from '../supabase/client'
import type {
  NumistaSearchResult,
  NumistaType,
  NumistaIssue,
} from '../../../shared/numista/types'
import {
  NumistaError,
  NumistaQuotaError,
  NumistaNotFoundError,
  NumistaAuthError,
} from '../../../shared/numista/errors'

/**
 * Reconstruye el error de dominio a partir de la respuesta del proxy.
 * supabase.functions.invoke colapsa cualquier respuesta no-2xx en un error
 * genérico, así que la discriminación se hace por el campo `name` del cuerpo.
 */
function toDomainError(data: unknown): NumistaError {
  const name = (data as { name?: string } | null)?.name
  switch (name) {
    case 'NumistaQuotaError': return new NumistaQuotaError()
    case 'NumistaNotFoundError': return new NumistaNotFoundError()
    case 'NumistaAuthError': return new NumistaAuthError()
    default: return new NumistaError('No se pudo consultar el catálogo de Numista.')
  }
}

async function callProxy<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('numista-proxy', { body })
  if (error) throw toDomainError(data)
  return data as T
}

export function searchByKm(km: string): Promise<NumistaSearchResult> {
  return callProxy({ op: 'searchByKm', km })
}

export function searchCatalogue(
  params: { issuer?: string; q?: string; year?: string },
): Promise<NumistaSearchResult> {
  return callProxy({ op: 'search', ...params })
}

export function getTypeWithIssues(
  typeId: number,
): Promise<{ type: NumistaType; issues: NumistaIssue[] }> {
  return callProxy({ op: 'getType', typeId })
}

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
 * Reconstruye el error de dominio a partir del error que devuelve
 * supabase.functions.invoke. Cuando la función responde con un status no-2xx,
 * el SDK devuelve `data: null` y coloca el cuerpo parseable únicamente en
 * `error.context`, que es el objeto `Response` original (para
 * FunctionsHttpError y FunctionsRelayError). Para FunctionsFetchError
 * (fallo de red) `context` no es un `Response`, así que no hay cuerpo que leer.
 * Cualquier cuerpo no-JSON o ausencia de `name` degrada al error genérico.
 */
async function toDomainError(error: unknown): Promise<NumistaError> {
  const context = (error as { context?: unknown } | null | undefined)?.context

  let body: { name?: string } | null = null
  if (typeof Response !== 'undefined' && context instanceof Response) {
    try {
      body = await context.clone().json()
    } catch {
      body = null
    }
  }

  switch (body?.name) {
    case 'NumistaQuotaError': return new NumistaQuotaError()
    case 'NumistaNotFoundError': return new NumistaNotFoundError()
    case 'NumistaAuthError': return new NumistaAuthError()
    default: return new NumistaError('No se pudo consultar el catálogo de Numista.')
  }
}

async function callProxy<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('numista-proxy', { body })
  if (error) throw await toDomainError(error)
  return data as T
}

export function searchByKm(km: string): Promise<NumistaSearchResult> {
  return callProxy({ op: 'searchByKm', km })
}

export function searchCatalogue(
  params: { issuer?: string; q?: string; year?: string },
): Promise<NumistaSearchResult> {
  // El Edge Function descarta `year` si no llega como string
  // (`typeof body.year === 'string'`), así que se fuerza aquí en runtime
  // en vez de confiar solo en el tipo estático.
  const { year, ...rest } = params
  return callProxy({
    op: 'search',
    ...rest,
    ...(year !== undefined ? { year: String(year) } : {}),
  })
}

export function getTypeWithIssues(
  typeId: number,
): Promise<{ type: NumistaType; issues: NumistaIssue[] }> {
  return callProxy({ op: 'getType', typeId })
}

import type {
  NumistaType,
  NumistaIssue,
  NumistaSearchResult,
  NumistaIssuersResult,
} from '../../../shared/numista/types.ts'
import {
  NumistaError,
  NumistaQuotaError,
  NumistaNotFoundError,
  NumistaAuthError,
} from '../../../shared/numista/errors.ts'

const BASE_URL = 'https://api.numista.com/v3'
const KM_CATALOGUE_ID = 3

function apiKey(): string {
  const key = Deno.env.get('NUMISTA_API_KEY')
  if (!key) throw new NumistaAuthError()
  return key
}

async function call<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(BASE_URL + path)
  url.searchParams.set('lang', 'es')
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, v)
  }

  const res = await fetch(url, { headers: { 'Numista-API-Key': apiKey() } })

  if (res.status === 429) throw new NumistaQuotaError()
  if (res.status === 404) throw new NumistaNotFoundError()
  if (res.status === 401) throw new NumistaAuthError()
  if (!res.ok) throw new NumistaError(`Numista respondió ${res.status}`, res.status)

  return await res.json() as T
}

export function searchByKm(km: string, issuer?: string): Promise<NumistaSearchResult> {
  // El parámetro `number` sólo funciona acompañado de `catalogue`. `issuer`
  // es opcional: los números KM no son únicos entre países (KM 59 existe
  // para Chile, Canadá, Marruecos, etc.), así que se acepta para acotar la
  // búsqueda a un emisor, pero sin él la búsqueda mundial sigue funcionando
  // (fallback cuando no se conoce el país).
  return call('/types', { catalogue: String(KM_CATALOGUE_ID), number: km, issuer: issuer ?? '' })
}

export function listIssuers(): Promise<NumistaIssuersResult> {
  return call('/issuers', {})
}

export function search(params: { issuer?: string; q?: string; year?: string }): Promise<NumistaSearchResult> {
  return call('/types', {
    issuer: params.issuer ?? '',
    q: params.q ?? '',
    year: params.year ?? '',
  })
}

export function getType(typeId: number): Promise<NumistaType> {
  return call(`/types/${typeId}`, {})
}

export function getIssues(typeId: number): Promise<NumistaIssue[]> {
  return call(`/types/${typeId}/issues`, {})
}

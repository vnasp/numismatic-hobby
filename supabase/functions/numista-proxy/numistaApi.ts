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
import { KM_CATALOGUE_ID } from '../../../shared/numista/references.ts'

const BASE_URL = 'https://api.numista.com/v3'

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

export function searchByKm(
  km: string,
  issuer?: string,
  catalogueId: number = KM_CATALOGUE_ID,
): Promise<NumistaSearchResult> {
  // El parámetro `number` sólo funciona acompañado de `catalogue`. `issuer`
  // es opcional: los números KM no son únicos entre países (KM 59 existe
  // para Chile, Canadá, Marruecos, etc.), así que se acepta para acotar la
  // búsqueda a un emisor, pero sin él la búsqueda mundial sigue funcionando
  // (fallback cuando no se conoce el país). `catalogueId` permite buscar el
  // mismo número en Yeoman (Y#) para las monedas que no tienen KM.
  return call('/types', { catalogue: String(catalogueId), number: km, issuer: issuer ?? '' })
}

export function listIssuers(): Promise<NumistaIssuersResult> {
  return call('/issuers', {})
}

export interface SearchParams {
  issuer?: string
  q?: string
  /** Año tal como está escrito en la moneda. */
  year?: string
  /** Año gregoriano de emisión, o un rango: `1900-2026`. */
  date?: string
  /** Id del catálogo: acota a los tipos que tienen número en él. */
  catalogueId?: number
  /** Id del tipo de objeto: 1 son las monedas de circulación estándar. */
  objectType?: number
  page?: number
  count?: number
  order?: string
}

/**
 * Búsqueda en el catálogo.
 *
 * Acepta además de `q`/`issuer`/`year` los parámetros que hacen falta para
 * recorrer un emisor completo: `date` para acotar por período, `catalogue`
 * para quedarse sólo con los tipos que tienen número en ese catálogo,
 * `object_type` para dejar fuera patrones y fichas, y la paginación.
 *
 * Ojo: la respuesta del listado no trae las referencias. Saber qué número
 * KM le toca a cada tipo exige después un `GET /types/{id}` por tipo.
 */
export function search(params: SearchParams): Promise<NumistaSearchResult> {
  return call('/types', {
    issuer: params.issuer ?? '',
    q: params.q ?? '',
    year: params.year ?? '',
    date: params.date ?? '',
    catalogue: params.catalogueId ? String(params.catalogueId) : '',
    object_type: params.objectType ? String(params.objectType) : '',
    page: params.page ? String(params.page) : '',
    count: params.count ? String(params.count) : '',
    order: params.order ?? '',
  })
}

export function getType(typeId: number): Promise<NumistaType> {
  return call(`/types/${typeId}`, {})
}

export function getIssues(typeId: number): Promise<NumistaIssue[]> {
  return call(`/types/${typeId}/issues`, {})
}

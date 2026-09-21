import { supabase } from "../supabase/client";
import type {
  NumistaSearchResult,
  NumistaType,
  NumistaIssue,
} from "../../../shared/numista/types";
import {
  NumistaError,
  NumistaQuotaError,
  NumistaNotFoundError,
  NumistaAuthError,
} from "../../../shared/numista/errors";
import type { CatalogueCode } from "../../../shared/numista/references";

export interface IssuerOption {
  issuer_code: string;
  issuer_name: string;
}

interface CachedIssuersResponse {
  issuers: IssuerOption[];
}

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
  const context = (error as { context?: unknown } | null | undefined)?.context;

  let body: { name?: string; error?: string } | null = null;
  if (typeof Response !== "undefined" && context instanceof Response) {
    try {
      body = await context.clone().json();
    } catch {
      body = null;
    }
  }

  switch (body?.name) {
    case "NumistaQuotaError":
      return new NumistaQuotaError();
    case "NumistaNotFoundError":
      return new NumistaNotFoundError();
    case "NumistaAuthError":
      return new NumistaAuthError();
    default:
      return new NumistaError(
        body?.error ?? "No se pudo consultar el catálogo de Numista.",
        context instanceof Response ? context.status : undefined,
      );
  }
}

async function callProxy<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("numista-proxy", {
    body,
  });
  if (error) throw await toDomainError(error);
  return data as T;
}

export async function ensureIssuersCached(): Promise<void> {
  await callProxy({ op: "listIssuers" });
}

export async function getCachedIssuers(): Promise<IssuerOption[]> {
  const data = await callProxy<CachedIssuersResponse>({ op: "listIssuers" });
  return data.issuers;
}

export function searchByKm(
  km: string,
  issuer?: string,
  catalogue: CatalogueCode = "KM",
): Promise<NumistaSearchResult> {
  const normalizedIssuer = issuer?.trim().toLowerCase();
  return callProxy({
    op: "searchByKm",
    km,
    ...(normalizedIssuer ? { issuer: normalizedIssuer } : {}),
    // KM es el valor por defecto del proxy: sólo se envía cuando es otro.
    ...(catalogue !== "KM" ? { catalogue } : {}),
  });
}

export interface CatalogueSearchParams {
  issuer?: string;
  q?: string;
  /** Año tal como está escrito en la moneda. */
  year?: string | number;
  /** Año gregoriano de emisión, o un rango: `1900-2026`. */
  date?: string;
  /** Deja sólo los tipos que tienen número en ese catálogo. */
  catalogue?: CatalogueCode;
  /** Tipo de objeto: 1 son las monedas de circulación estándar. */
  objectType?: number;
  page?: number;
  /** Resultados por página. El proxy lo recorta al tope de 100 de la API. */
  count?: number;
  order?: "value" | "ruler" | "type" | "reference" | "date" | "relevance";
}

export function searchCatalogue(
  params: CatalogueSearchParams,
): Promise<NumistaSearchResult> {
  // El Edge Function descarta `year` si no llega como string
  // (`typeof body.year === 'string'`), así que se fuerza aquí en runtime
  // en vez de confiar solo en el tipo estático.
  const { year, ...rest } = params;
  return callProxy({
    op: "search",
    ...rest,
    ...(year !== undefined ? { year: String(year) } : {}),
  });
}

/**
 * Una página del catálogo de un emisor, acotada a un período y a un
 * catálogo de referencia.
 *
 * Es el primero de los dos pasos que hacen falta para armar una lista por
 * número KM: esto dice *qué tipos existen*, pero no qué número le toca a
 * cada uno —el listado de la API no trae las referencias—, así que después
 * hay que pedir el detalle de cada tipo con `getTypeWithIssues`.
 *
 * Pide de a 100, que es el tope: recorrer Chile desde 1900 cuesta así dos
 * llamadas de listado en vez de veinte.
 */
export function browseIssuer(params: {
  issuer: string;
  /** Un año o un rango: `1900-2026`. */
  date: string;
  catalogue?: CatalogueCode;
  objectType?: number;
  page?: number;
}): Promise<NumistaSearchResult> {
  return searchCatalogue({
    ...params,
    issuer: params.issuer.trim().toLowerCase(),
    catalogue: params.catalogue ?? "KM",
    count: 100,
    // Ordenado por número de catálogo: es el orden en que se va a leer la
    // tabla, y deja las páginas estables entre corridas.
    order: "reference",
  });
}

export function getTypeWithIssues(
  typeId: number,
): Promise<{ type: NumistaType; issues: NumistaIssue[] }> {
  return callProxy({ op: "getType", typeId });
}

export interface MetaListResult {
  meta: string;
  /** Cuántos tipos dice Numista que hay en total. */
  total: number;
  imported: number;
  pages: number;
}

/**
 * Fase 1 de una meta: trae el listado completo desde Numista.
 *
 * Son pocas llamadas porque pide de a 100. No trae los números de
 * catálogo —el listado de Numista no los incluye— pero sí el universo, que
 * es lo que permite contar cuántas faltan.
 */
export function importMetaList(meta: string): Promise<MetaListResult> {
  return callProxy({ op: "importMetaList", meta });
}

export interface MetaDetailsResult {
  meta: string;
  fetched: number;
  /** Tipos cuyo detalle no se pudo bajar; se saltan para no trancar. */
  failed: number[];
  remaining: number;
  /** La cuota mensual se acabó: lo bajado quedó guardado. */
  quotaReached: boolean;
}

/**
 * Fase 2 de una meta: baja el detalle de un lote de tipos.
 *
 * Va por lotes porque son decenas de llamadas y cada Edge Function tiene
 * su límite de tiempo. Hay que seguir llamando mientras `remaining` no
 * llegue a cero —y cortar si `fetched` da cero, que significa que lo que
 * queda no se puede bajar.
 */
export function fillMetaDetails(
  meta: string,
  batch = 10,
): Promise<MetaDetailsResult> {
  return callProxy({ op: "fillMetaDetails", meta, batch });
}

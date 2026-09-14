import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type {
  NumistaType,
  NumistaIssue,
  NumistaIssuer,
} from "../../../shared/numista/types.ts";
import { extractKmNumber } from "../../../shared/numista/references.ts";

// Un insert único con los ~4239 emisores puede superar límites de tamaño de
// PostgREST/Postgres; se envían en lotes.
const REGIONS_INSERT_CHUNK_SIZE = 500;

export async function readCachedType(
  db: SupabaseClient,
  typeId: number,
): Promise<{ type: NumistaType; issues: NumistaIssue[] } | null> {
  const { data: typeRow } = await db
    .from("coins_types")
    .select("raw")
    .eq("numista_id", typeId)
    .maybeSingle();

  if (!typeRow) return null;

  const { data: issueRows } = await db
    .from("coins_issues")
    .select("raw")
    .eq("numista_id", typeId);

  const issues = (issueRows ?? []).map((r) => r.raw as NumistaIssue);

  // `writeCachedType` escribe coins_types y luego coins_issues por separado
  // (no es atómico). Si la segunda escritura falla, quedaría un type
  // cacheado con cero issues para siempre, indistinguible de un tipo que
  // genuinamente no tiene issues en Numista. Tratamos ese caso como cache
  // MISS: forzamos un re-fetch que se autorrepara escribiendo de nuevo.
  // Costo aceptado: un tipo con cero issues reales jamás "pega" en caché y
  // se re-consulta en cada getType; es preferible a servir para siempre una
  // lista vacía que en realidad es el síntoma de una escritura rota.
  if (issues.length === 0) return null;

  return {
    type: typeRow.raw as NumistaType,
    issues,
  };
}

export async function writeCachedType(
  db: SupabaseClient,
  type: NumistaType,
  issues: NumistaIssue[],
): Promise<void> {
  const { error: typeError } = await db.from("coins_types").upsert({
    numista_id: type.id,
    title: type.title,
    issuer_code: type.issuer?.code ?? null,
    issuer_name: type.issuer?.name ?? null,
    min_year: type.min_year ?? null,
    max_year: type.max_year ?? null,
    composition_text: type.composition?.text ?? null,
    shape: type.shape ?? null,
    weight: type.weight ?? null,
    size: type.size ?? null,
    thickness: type.thickness ?? null,
    obverse_thumbnail: type.obverse?.thumbnail ?? null,
    obverse_picture: type.obverse?.picture ?? null,
    reverse_thumbnail: type.reverse?.thumbnail ?? null,
    reverse_picture: type.reverse?.picture ?? null,
    km_number: extractKmNumber(type.references),
    raw: type,
    fetched_at: new Date().toISOString(),
  });
  if (typeError) {
    throw new Error(`No se pudo cachear coins_types: ${typeError.message}`);
  }

  if (issues.length === 0) return;

  const { error: issuesError } = await db.from("coins_issues").upsert(
    issues.map((issue) => ({
      numista_issue_id: issue.id,
      numista_id: type.id,
      year: issue.year ?? null,
      gregorian_year: issue.gregorian_year ?? null,
      mint_letter: issue.mint_letter ?? null,
      mintage: issue.mintage ?? null,
      comment: issue.comment ?? null,
      km_number: extractKmNumber(issue.references),
      raw: issue,
      fetched_at: new Date().toISOString(),
    })),
  );
  if (issuesError) {
    throw new Error(`No se pudo cachear coins_issues: ${issuesError.message}`);
  }
}

/**
 * Cantidad de filas en `coins_regions`. Se usa para decidir si hace falta
 * poblar la tabla desde `GET /issuers` (op `listIssuers`): esa llamada debe
 * ocurrir una única vez en la vida de la app, porque consume cuota mensual
 * de la API que la usuaria paga.
 */
export async function regionsCount(db: SupabaseClient): Promise<number> {
  const { count, error } = await db
    .from("coins_regions")
    .select("issuer_code", { count: "exact", head: true });

  if (error) {
    throw new Error(`No se pudo leer coins_regions: ${error.message}`);
  }

  return count ?? 0;
}

export async function readCachedIssuers(
  db: SupabaseClient,
): Promise<{ issuer_code: string; issuer_name: string }[]> {
  const pageSize = 1000;
  const issuers: { issuer_code: string; issuer_name: string }[] = [];

  for (let page = 0; ; page += 1) {
    const { data, error } = await db
      .from("coins_regions")
      .select("issuer_code, issuer_name")
      .eq("visible_in_selector", true)
      .order("issuer_name")
      .order("issuer_code")
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      throw new Error(`No se pudieron leer coins_regions: ${error.message}`);
    }

    issuers.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  return issuers;
}

/** Escribe los emisores de Numista en `coins_regions`, en lotes. */
export async function writeCachedIssuers(
  db: SupabaseClient,
  issuers: NumistaIssuer[],
): Promise<void> {
  for (let i = 0; i < issuers.length; i += REGIONS_INSERT_CHUNK_SIZE) {
    const chunk = issuers.slice(i, i + REGIONS_INSERT_CHUNK_SIZE);
    const { error } = await db.from("coins_regions").upsert(
      chunk.map((issuer) => ({
        issuer_code: issuer.code,
        issuer_name: issuer.name,
      })),
      { onConflict: "issuer_code" },
    );
    if (error) {
      throw new Error(`No se pudo cachear coins_regions: ${error.message}`);
    }
  }
}

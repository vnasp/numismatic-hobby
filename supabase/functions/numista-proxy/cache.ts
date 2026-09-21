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

// --- Metas de colección -----------------------------------------------------

export interface MetaRow {
  slug: string;
  issuer_code: string;
  catalogue_code: string;
  from_year: number | null;
  to_year: number | null;
  counted_object_types: string[];
}

export async function readMeta(
  db: SupabaseClient,
  slug: string,
): Promise<MetaRow | null> {
  const { data } = await db
    .from("coins_metas")
    .select("slug, issuer_code, catalogue_code, from_year, to_year, counted_object_types")
    .eq("slug", slug)
    .maybeSingle();

  return (data as MetaRow | null) ?? null;
}

/**
 * Guarda el listado de una meta.
 *
 * Es un upsert y no un borrar-e-insertar: si Numista agrega un tipo, la
 * reimportación lo suma sin dejar la tabla vacía en el intermedio. Los
 * tipos que Numista *quitara* quedarían de más, que es el error inofensivo
 * de los dos.
 */
export async function writeMetaTypes(
  db: SupabaseClient,
  metaSlug: string,
  types: {
    id: number;
    title: string;
    object_type?: { id: string; name: string };
    min_year?: number;
    max_year?: number;
    obverse_thumbnail?: string;
    reverse_thumbnail?: string;
  }[],
): Promise<void> {
  if (types.length === 0) return;

  const { error } = await db.from("coins_meta_types").upsert(
    types.map((type) => ({
      meta_slug: metaSlug,
      numista_id: type.id,
      title: type.title,
      object_type_id: type.object_type?.id ?? null,
      object_type_name: type.object_type?.name ?? null,
      min_year: type.min_year ?? null,
      max_year: type.max_year ?? null,
      obverse_thumbnail: type.obverse_thumbnail ?? null,
      reverse_thumbnail: type.reverse_thumbnail ?? null,
    })),
  );

  if (error) throw new Error(`No se pudo guardar el listado: ${error.message}`);
}

export async function touchMetaListed(
  db: SupabaseClient,
  slug: string,
): Promise<void> {
  await db
    .from("coins_metas")
    .update({ listed_at: new Date().toISOString() })
    .eq("slug", slug);
}

/**
 * Los tipos de la meta que cuentan para el avance y todavía no tienen su
 * detalle en la caché.
 *
 * Son los que le faltan a la segunda fase. Se calcula en cada llamada
 * contra lo que hay en `coins_types`, así que la importación es reanudable
 * sin llevar ningún cursor: si se corta a la mitad, la siguiente corrida
 * pide exactamente lo que quedó pendiente.
 */
export async function pendingMetaTypeIds(
  db: SupabaseClient,
  meta: MetaRow,
  limit: number,
): Promise<{ ids: number[]; remaining: number }> {
  let query = db
    .from("coins_meta_types")
    .select("numista_id", { count: "exact" })
    .eq("meta_slug", meta.slug);

  if (meta.counted_object_types.length > 0) {
    query = query.in("object_type_name", meta.counted_object_types);
  }

  const { data: counted } = await query;
  const wanted = (counted ?? []).map((row) => row.numista_id as number);
  if (wanted.length === 0) return { ids: [], remaining: 0 };

  const { data: cached } = await db
    .from("coins_types")
    .select("numista_id")
    .in("numista_id", wanted);

  const have = new Set((cached ?? []).map((row) => row.numista_id as number));
  const pending = wanted.filter((id) => !have.has(id));

  return { ids: pending.slice(0, limit), remaining: pending.length };
}

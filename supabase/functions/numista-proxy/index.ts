import { createClient } from "jsr:@supabase/supabase-js@2";
import * as api from "./numistaApi.ts";
import {
  readCachedType,
  writeCachedType,
  regionsCount,
  readCachedIssuers,
  writeCachedIssuers,
  readMeta,
  writeMetaTypes,
  touchMetaListed,
  pendingMetaTypeIds,
} from "./cache.ts";
import {
  NumistaError,
  NumistaQuotaError,
} from "../../../shared/numista/errors.ts";
import { SEARCH_CATALOGUES } from "../../../shared/numista/references.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  // supabase-js envía siempre `apikey` y `x-client-info` además del token:
  // omitirlos aquí hace que el navegador bloquee la petición en el preflight.
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Tope de resultados por página que acepta la API. */
const MAX_COUNT = 100;

/** Los órdenes que documenta la spec para `GET /types`. */
const SEARCH_ORDERS = new Set([
  "value",
  "ruler",
  "type",
  "reference",
  "date",
  "relevance",
]);

/** Marca de "vino algo, pero no sirve", distinta de "no vino nada". */
const INVALID = Symbol("invalid");

/**
 * Un entero positivo opcional: `undefined` si no vino, `INVALID` si vino
 * algo que no lo es. Sin esa distinción, un `page: "abc"` se trataría como
 * ausente y devolvería la página 1 en silencio.
 */
function optionalInt(value: unknown): number | undefined | typeof INVALID {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : INVALID;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "No autenticado" }, 401);

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // El usuario debe estar autenticado: el proxy no es un endpoint abierto,
  // porque cada llamada puede consumir cuota mensual de la API.
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: "No autenticado" }, 401);

  try {
    const body = await req.json();

    switch (body.op) {
      case "searchByKm": {
        const km = typeof body.km === "string" ? body.km.trim() : "";
        if (!km) return json({ error: "El parámetro km es requerido" }, 400);
        const issuer =
          typeof body.issuer === "string"
            ? body.issuer.trim().toLowerCase()
            : "";
        // Sólo se aceptan los catálogos conocidos: un id arbitrario gastaría
        // cuota en búsquedas que la app nunca hace.
        const catalogue = body.catalogue ?? "KM";
        if (!Object.hasOwn(SEARCH_CATALOGUES, catalogue)) {
          return json({ error: "catalogue debe ser KM o Y" }, 400);
        }
        const catalogueId =
          SEARCH_CATALOGUES[catalogue as keyof typeof SEARCH_CATALOGUES];
        return json(
          await api.searchByKm(km, issuer || undefined, catalogueId),
        );
      }

      case "search": {
        const issuer =
          typeof body.issuer === "string" ? body.issuer.trim() : "";
        const q = typeof body.q === "string" ? body.q.trim() : "";
        const year = typeof body.year === "string" ? body.year.trim() : "";
        const date = typeof body.date === "string" ? body.date.trim() : "";

        // Numista exige al menos uno de estos; pedirlo acá evita gastar una
        // llamada para que la API conteste 400.
        if (!issuer && !q && !year && !date && !body.catalogue) {
          return json(
            {
              error:
                "Se requiere al menos uno de: issuer, q, year, date, catalogue",
            },
            400,
          );
        }

        // Un año, o un rango de años. Se valida la forma para que una fecha
        // escrita a mano no se lleve una llamada de la cuota.
        if (date && !/^\d{1,4}(-\d{1,4})?$/.test(date)) {
          return json(
            { error: "date debe ser un año o un rango, como 1900-2026" },
            400,
          );
        }

        let catalogueId: number | undefined;
        if (body.catalogue !== undefined) {
          if (!Object.hasOwn(SEARCH_CATALOGUES, body.catalogue)) {
            return json({ error: "catalogue debe ser KM o Y" }, 400);
          }
          catalogueId =
            SEARCH_CATALOGUES[body.catalogue as keyof typeof SEARCH_CATALOGUES];
        }

        const objectType = optionalInt(body.objectType);
        if (objectType === INVALID) {
          return json({ error: "objectType debe ser un entero positivo" }, 400);
        }

        const page = optionalInt(body.page);
        if (page === INVALID) {
          return json({ error: "page debe ser un entero positivo" }, 400);
        }

        // El tope de la API es 100. Se recorta acá en vez de dejar que
        // conteste 400: pedir de a 100 es lo que hace que recorrer un
        // emisor completo cueste dos llamadas y no veinte.
        const count = optionalInt(body.count);
        if (count === INVALID) {
          return json({ error: "count debe ser un entero positivo" }, 400);
        }

        const order =
          typeof body.order === "string" ? body.order.trim() : undefined;
        if (order && !SEARCH_ORDERS.has(order)) {
          return json(
            { error: `order debe ser uno de: ${[...SEARCH_ORDERS].join(", ")}` },
            400,
          );
        }

        return json(
          await api.search({
            issuer,
            q,
            year,
            date,
            catalogueId,
            objectType,
            page,
            count: count === undefined ? undefined : Math.min(count, MAX_COUNT),
            order,
          }),
        );
      }

      case "getType": {
        const typeId = Number(body.typeId);
        if (!Number.isInteger(typeId) || typeId <= 0) {
          return json({ error: "typeId debe ser un entero positivo" }, 400);
        }
        const cached = await readCachedType(db, typeId);
        if (cached) return json({ ...cached, fromCache: true });

        const [type, issues] = await Promise.all([
          api.getType(typeId),
          api.getIssues(typeId),
        ]);
        await writeCachedType(db, type, issues);
        return json({ type, issues, fromCache: false });
      }

      case "listIssuers": {
        // Puebla coins_regions desde GET /issuers una única vez en toda la
        // vida de la app: si la tabla ya tiene filas, es un no-op que no
        // gasta cuota de la API. La usuaria paga esa cuota, así que este
        // op nunca debe volver a llamar a Numista una vez poblada la tabla.
        const existing = await regionsCount(db);
        if (existing > 0) {
          return json({
            populated: false,
            count: existing,
            issuers: await readCachedIssuers(db),
          });
        }

        const { issuers } = await api.listIssuers();
        await writeCachedIssuers(db, issuers);
        return json({
          populated: true,
          count: issuers.length,
          issuers: await readCachedIssuers(db),
        });
      }

      /**
       * Fase 1: trae el listado completo de una meta y lo guarda.
       *
       * Son pocas llamadas —de a 100 por página— y no traen la referencia
       * de catálogo: el listado de Numista no la incluye. Lo que deja es
       * el universo, que es lo que permite saber cuántas faltan sin
       * haberlas bajado una por una.
       */
      case "importMetaList": {
        const slug = typeof body.meta === "string" ? body.meta.trim() : "";
        const meta = slug ? await readMeta(db, slug) : null;
        if (!meta) return json({ error: "Meta desconocida" }, 404);

        const catalogueId =
          SEARCH_CATALOGUES[
            meta.catalogue_code as keyof typeof SEARCH_CATALOGUES
          ];
        const date = `${meta.from_year ?? 1}-${
          meta.to_year ?? new Date().getFullYear()
        }`;

        let page = 1;
        let total = 0;
        let imported = 0;

        // Tope de seguridad: 20 páginas son 2000 tipos. Una meta más
        // grande que eso está mal definida, y sin el tope un `count` raro
        // de la API haría girar el bucle contra la cuota.
        while (page <= 20) {
          const result = await api.search({
            issuer: meta.issuer_code,
            date,
            catalogueId,
            page,
            count: MAX_COUNT,
            order: "reference",
          });

          total = result.count;
          await writeMetaTypes(db, meta.slug, result.types);
          imported += result.types.length;

          if (imported >= total || result.types.length === 0) break;
          page += 1;
        }

        await touchMetaListed(db, meta.slug);
        return json({ meta: meta.slug, total, imported, pages: page });
      }

      /**
       * Fase 2: baja el detalle de los tipos que cuentan para la meta.
       *
       * Una llamada por tipo, no dos: acá interesa el número de catálogo y
       * no las emisiones. Va de a lotes porque son decenas de llamadas y
       * cada Edge Function tiene su propio límite de tiempo; el cliente
       * vuelve a llamar mientras queden pendientes.
       *
       * Reanudable sin cursor: lo pendiente se recalcula cada vez contra
       * lo que ya está en `coins_types`. Si la cuota se acaba a la mitad,
       * lo bajado queda escrito y la siguiente corrida sigue donde iba.
       */
      case "fillMetaDetails": {
        const slug = typeof body.meta === "string" ? body.meta.trim() : "";
        const meta = slug ? await readMeta(db, slug) : null;
        if (!meta) return json({ error: "Meta desconocida" }, 404);

        const requested = optionalInt(body.batch);
        if (requested === INVALID) {
          return json({ error: "batch debe ser un entero positivo" }, 400);
        }
        // Tope de 25 por lote: cada tipo son dos llamadas a Numista, y la
        // Edge Function tiene su propio límite de tiempo.
        const batch = Math.min(requested ?? 10, 25);
        const { ids, remaining } = await pendingMetaTypeIds(db, meta, batch);

        let fetched = 0;
        const failed: number[] = [];
        let quotaReached = false;

        for (const typeId of ids) {
          try {
            // Sólo el tipo, no sus emisiones: la meta necesita el número de
            // catálogo, y ése vive en el tipo. Pedir además las emisiones
            // duplicaría el costo para traer los años de monedas que puede
            // que nunca se tengan.
            //
            // El precio es que `readCachedType` considera fallo de caché un
            // tipo con cero emisiones, así que la primera vez que se abra
            // uno de éstos para agregar una moneda se va a repedir entero.
            // Es el intercambio correcto: esa llamada se paga sólo por las
            // que efectivamente se consiguen, y se pagaría igual al
            // agregarlas.
            const type = await api.getType(typeId);
            await writeCachedType(db, type, []);
            fetched += 1;
          } catch (err) {
            // La cuota se acabó: se corta el lote pero se responde 200 con
            // lo que sí entró. Un 500 acá perdería la cuenta de lo hecho.
            if (err instanceof NumistaQuotaError) {
              quotaReached = true;
              break;
            }
            // Un tipo que el listado trae pero cuyo detalle no se puede
            // bajar se anota y se sigue. Si tumbara el lote entero, un
            // solo tipo roto dejaría la importación trancada para siempre,
            // porque nunca llegaría a la caché y volvería a encabezar la
            // lista de pendientes en cada corrida.
            failed.push(typeId);
          }
        }

        return json({
          meta: meta.slug,
          fetched,
          failed,
          remaining: remaining - fetched,
          quotaReached,
        });
      }

      default:
        return json({ error: `Operación desconocida: ${body.op}` }, 400);
    }
  } catch (err) {
    if (err instanceof NumistaError) {
      return json({ error: err.message, name: err.name }, err.status ?? 500);
    }
    return json({ error: "Error inesperado en el proxy" }, 500);
  }
});

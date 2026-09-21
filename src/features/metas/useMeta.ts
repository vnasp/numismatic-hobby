import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/client'
import { formatReference, preferredReference } from '../../../shared/numista/references'
import type { NumistaReference } from '../../../shared/numista/types'

/** Un tipo del catálogo dentro de la meta. */
export interface MetaType {
  numistaId: number
  title: string
  minYear: number | null
  maxYear: number | null
  /**
   * La ficha del tipo en Numista, tal como la devuelve la API.
   *
   * No se arma concatenando el id: la forma de la URL es cosa de Numista y
   * ya viene en la respuesta del detalle. Los tipos sin detalle bajado no
   * la tienen todavía, y por eso es nullable.
   */
  url: string | null
  /** Si hay al menos un ejemplar de este tipo en la colección. */
  owned: boolean
  /** Si ya se bajó su detalle, que es de donde sale el número. */
  detailed: boolean
}

/**
 * Una casilla de la meta: un número de catálogo y los tipos que lo llevan.
 *
 * La unidad es el número y no el tipo de Numista porque así se colecciona:
 * quien persigue los KM de Chile quiere el KM 179, no las tres variantes de
 * anverso que Numista distingue dentro de él. La casilla se da por
 * conseguida con tener cualquiera de sus tipos.
 */
export interface MetaSlot {
  /** `KM 179a`, o null en los que todavía no tienen detalle bajado. */
  reference: string | null
  types: MetaType[]
  owned: boolean
  /** La ficha en Numista a la que lleva la casilla, si ya se conoce. */
  url: string | null
}

export interface Meta {
  slug: string
  name: string
  issuerCode: string
  fromYear: number | null
  toYear: number | null
  /** Qué tipos de objeto cuentan para el avance. */
  countedObjectTypes: string[]
  /** Si ya se trajo el listado desde Numista. */
  listed: boolean
  slots: MetaSlot[]
  /** Los que están en el listado pero fuera del recuento. */
  uncountedCount: number
  /** Casillas cuyo detalle todavía no se baja: no se sabe su número. */
  pendingDetail: number
}

interface MetaRow {
  slug: string
  name: string
  issuer_code: string
  from_year: number | null
  to_year: number | null
  counted_object_types: string[]
  listed_at: string | null
}

interface MetaTypeRow {
  numista_id: number
  title: string
  object_type_name: string | null
  min_year: number | null
  max_year: number | null
  obverse_thumbnail: string | null
  reverse_thumbnail: string | null
}

interface CachedTypeRow {
  numista_id: number
  refs: NumistaReference[] | null
  url: string | null
}

/**
 * El estado de una meta: qué existe, qué tienes y qué falta.
 *
 * El cruce es local. El universo está en `coins_meta_types`, los números de
 * catálogo en la caché de `coins_types` y los ejemplares en `coins_items`:
 * saber cuánto te falta no cuesta ni una llamada a Numista.
 */
export function useMeta(slug: string) {
  return useQuery({
    queryKey: ['meta', slug],
    queryFn: async (): Promise<Meta | null> => {
      const { data: metaRow, error: metaError } = await supabase
        .from('coins_metas')
        .select('slug, name, issuer_code, from_year, to_year, counted_object_types, listed_at')
        .eq('slug', slug)
        .maybeSingle()

      if (metaError) {
        console.error('useMeta: error al leer coins_metas', metaError)
        throw new Error('No se pudo cargar la meta. Inténtalo de nuevo en unos minutos.')
      }
      if (!metaRow) return null

      const meta = metaRow as MetaRow

      const { data: typeRows, error: typesError } = await supabase
        .from('coins_meta_types')
        .select(
          'numista_id, title, object_type_name, min_year, max_year, obverse_thumbnail, reverse_thumbnail',
        )
        .eq('meta_slug', slug)

      if (typesError) {
        console.error('useMeta: error al leer coins_meta_types', typesError)
        throw new Error('No se pudo cargar la meta. Inténtalo de nuevo en unos minutos.')
      }

      const all = (typeRows ?? []) as MetaTypeRow[]
      const counted =
        meta.counted_object_types.length === 0
          ? all
          : all.filter((row) => meta.counted_object_types.includes(row.object_type_name ?? ''))

      if (counted.length === 0) {
        return {
          slug: meta.slug,
          name: meta.name,
          issuerCode: meta.issuer_code,
          fromYear: meta.from_year,
          toYear: meta.to_year,
          countedObjectTypes: meta.counted_object_types,
          listed: meta.listed_at != null,
          slots: [],
          uncountedCount: all.length - counted.length,
          pendingDetail: 0,
        }
      }

      const ids = counted.map((row) => row.numista_id)

      // El número de catálogo sale de la caché del detalle, que la fase 2
      // llena. Los tipos que todavía no se bajaron no tienen número, y eso
      // se muestra tal cual en vez de inventarlo.
      const { data: cachedRows } = await supabase
        .from('coins_types')
        .select('numista_id, refs:raw->references, url:raw->>url')
        .in('numista_id', ids)

      const cached = new Map(
        ((cachedRows ?? []) as unknown as CachedTypeRow[]).map((row) => [
          row.numista_id,
          { reference: preferredReference(row.refs ?? undefined), url: row.url },
        ]),
      )

      const { data: ownedRows } = await supabase
        .from('coins_items')
        .select('numista_id')
        .in('numista_id', ids)

      const owned = new Set((ownedRows ?? []).map((row) => row.numista_id as number))

      // Se agrupa por número; lo que no tiene detalle todavía va en su
      // propia casilla, identificada por el id del tipo.
      const slots = new Map<string, MetaSlot>()
      let pendingDetail = 0

      for (const row of counted) {
        const detail = cached.get(row.numista_id)
        const detailed = cached.has(row.numista_id)
        if (!detailed) pendingDetail += 1

        const label = detail?.reference ? formatReference(detail.reference) : null
        const key = label ?? `sin-detalle-${row.numista_id}`

        const type: MetaType = {
          numistaId: row.numista_id,
          title: row.title,
          minYear: row.min_year,
          maxYear: row.max_year,
          url: detail?.url ?? null,
          owned: owned.has(row.numista_id),
          detailed,
        }

        const slot = slots.get(key)
        if (slot) {
          slot.types.push(type)
          slot.owned ||= type.owned
          // La casilla lleva a la primera de sus variantes que tenga ficha.
          slot.url ??= type.url
        } else {
          slots.set(key, {
            reference: label,
            types: [type],
            owned: type.owned,
            url: type.url,
          })
        }
      }

      return {
        slug: meta.slug,
        name: meta.name,
        issuerCode: meta.issuer_code,
        fromYear: meta.from_year,
        toYear: meta.to_year,
        countedObjectTypes: meta.counted_object_types,
        listed: meta.listed_at != null,
        slots: sortSlots([...slots.values()]),
        uncountedCount: all.length - counted.length,
        pendingDetail,
      }
    },
  })
}

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' })

/**
 * Por número de catálogo en orden natural: KM 2 antes que KM 10, y 179
 * antes que 179a. Las casillas sin detalle van al final, donde se ven como
 * lo que son: trabajo pendiente y no huecos de la colección.
 */
function sortSlots(slots: MetaSlot[]): MetaSlot[] {
  return slots.sort((a, b) => {
    if (a.reference == null && b.reference == null) return 0
    if (a.reference == null) return 1
    if (b.reference == null) return -1
    return collator.compare(a.reference, b.reference)
  })
}

import { normalizeForSearch } from '../../../shared/numista/normalize'
import { formatReference } from '../../../shared/numista/references'
import { GRADES, type GradeCode } from '../../lib/grades'
import { materialFamily } from '../../lib/materials'
import type { CollectionEntry } from './useCollection'

export interface CountryTally {
  code: string | null
  name: string
  count: number
}

export interface Tally {
  label: string
  count: number
}

/** Emisor sin nombre en el catálogo: se agrupa aparte en vez de perderse. */
const UNKNOWN_COUNTRY = 'Sin país'

/**
 * Países presentes en la colección, del más representado al menos. A igual
 * cantidad se ordena alfabéticamente para que la lista no baile entre
 * renders.
 */
export function countryTallies(entries: CollectionEntry[]): CountryTally[] {
  const byName = new Map<string, CountryTally>()

  for (const entry of entries) {
    const name = entry.issuerName ?? UNKNOWN_COUNTRY
    const existing = byName.get(name)
    if (existing) {
      existing.count += 1
    } else {
      byName.set(name, { code: entry.issuerCode, name, count: 1 })
    }
  }

  return [...byName.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'),
  )
}

export interface CollectionFilter {
  query: string
  country: string | null
  continent?: string | null
}

/** Emisor sin continente asignado en `coins_regions`. */
export const UNKNOWN_CONTINENT = 'Sin continente'

/** Orden fijo de los continentes, para que los filtros no cambien de lugar. */
const CONTINENT_ORDER = ['América', 'Europa', 'Asia', 'África', 'Oceanía']

/**
 * Continentes presentes en la colección, en orden geográfico fijo y no por
 * cantidad: son pocos y se reconocen por la posición. Los sin continente van
 * al final.
 */
export function continentTallies(entries: CollectionEntry[]): Tally[] {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    const name = entry.continent ?? UNKNOWN_CONTINENT
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  const rank = (name: string) => {
    if (name === UNKNOWN_CONTINENT) return Number.MAX_SAFE_INTEGER
    const index = CONTINENT_ORDER.indexOf(name)
    return index === -1 ? CONTINENT_ORDER.length : index
  }

  return [...counts.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b, 'es'))
    .map(([label, count]) => ({ label, count }))
}

/** Si la moneda pertenece al continente elegido (null = todos). */
export function inContinent(entry: CollectionEntry, continent: string | null | undefined) {
  return !continent || (entry.continent ?? UNKNOWN_CONTINENT) === continent
}

/**
 * Filtra en el cliente sobre la colección ya cargada: son 200 y tantas fichas
 * en memoria, así que no hace falta volver a Postgres por cada tecla.
 *
 * La búsqueda es insensible a acentos y mayúsculas (misma normalización que
 * el autocompletado de país) y mira título, país, KM (o Y#) y año, porque cualquiera
 * de los cuatro es una forma legítima de acordarse de una moneda.
 */
export function filterEntries(
  entries: CollectionEntry[],
  { query, country, continent }: CollectionFilter,
): CollectionEntry[] {
  const needle = normalizeForSearch(query)

  return entries.filter((entry) => {
    if (!inContinent(entry, continent)) return false
    if (country && (entry.issuerName ?? UNKNOWN_COUNTRY) !== country) return false
    if (!needle) return true

    const haystack = normalizeForSearch(
      [
        entry.title,
        entry.issuerName,
        entry.reference && formatReference(entry.reference),
        entry.issueYear,
      ]
        .filter(Boolean)
        .join(' '),
    )
    return haystack.includes(needle)
  })
}

export type CollectionView = 'grilla' | 'lista'

export function isCollectionView(value: string | null): value is CollectionView {
  return value === 'grilla' || value === 'lista'
}

export type CollectionSort = 'recientes' | 'favoritas' | 'km' | 'anio'

export const SORT_OPTIONS: { value: CollectionSort; label: string }[] = [
  { value: 'recientes', label: 'Agregadas recientemente' },
  { value: 'favoritas', label: 'Favoritas primero' },
  { value: 'km', label: 'Continente · país · KM' },
  { value: 'anio', label: 'Continente · país · año' },
]

export function isCollectionSort(value: string | null): value is CollectionSort {
  return SORT_OPTIONS.some((option) => option.value === value)
}

function continentRank(continent: string | null): number {
  if (!continent) return CONTINENT_ORDER.length + 1
  const index = CONTINENT_ORDER.indexOf(continent)
  return index === -1 ? CONTINENT_ORDER.length : index
}

/** Compara con los vacíos siempre al final, sea cual sea el orden. */
function nullsLast<T>(a: T | null, b: T | null, compare: (a: T, b: T) => number): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return compare(a, b)
}

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' })

/**
 * Número de catálogo en orden natural: 2 < 10 < 179 < 179a < 216 < 216.1.
 * KM va antes que Y# dentro de un mismo país.
 */
function compareReference(a: CollectionEntry, b: CollectionEntry): number {
  return nullsLast(a.reference, b.reference, (x, y) =>
    x.code === y.code ? collator.compare(x.number, y.number) : x.code === 'KM' ? -1 : 1,
  )
}

/** Siempre por el año gregoriano: 5745 y 1985 son la misma moneda. */
function compareYear(a: CollectionEntry, b: CollectionEntry): number {
  return nullsLast(a.gregorianYear, b.gregorianYear, (x, y) => x - y)
}

/**
 * Ordena la colección como se guardan los cartones en cajas: por continente
 * (en el orden fijo de los filtros), después por país alfabéticamente y dentro
 * del país por KM o por año. Lo que no tiene continente, país, KM o año va al
 * final de su grupo.
 *
 * `recientes` conserva el orden en que llegan, que es el de creación, y
 * `favoritas` sube las marcadas manteniendo ese mismo orden dentro de cada
 * grupo: es la forma de ver las favoritas juntas sin esconder el resto.
 */
export function sortEntries(entries: CollectionEntry[], sort: CollectionSort): CollectionEntry[] {
  if (sort === 'recientes') return entries

  if (sort === 'favoritas') {
    return [...entries].sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite))
  }

  const [first, second] =
    sort === 'km' ? [compareReference, compareYear] : [compareYear, compareReference]

  return [...entries].sort(
    (a, b) =>
      continentRank(a.continent) - continentRank(b.continent) ||
      nullsLast(a.issuerName, b.issuerName, collator.compare) ||
      first(a, b) ||
      second(a, b) ||
      collator.compare(a.title, b.title),
  )
}

export interface ValueTotal {
  currency: string
  total: number
  /** Cuántas monedas suman ese total. */
  count: number
}

/**
 * Valor total por moneda, y cuántos ejemplares hay sin valorar.
 *
 * No se suman monedas distintas: no hay tipo de cambio en la app y convertir
 * a ojo daría un total falso. Si hay valoraciones en pesos y en euros, se
 * muestran los dos totales por separado.
 */
export function valueTotals(entries: CollectionEntry[]): ValueTotal[] {
  const totals = new Map<string, ValueTotal>()

  for (const entry of entries) {
    if (!entry.value) continue
    const existing = totals.get(entry.value.currency)
    if (existing) {
      existing.total += entry.value.amount
      existing.count += 1
    } else {
      totals.set(entry.value.currency, {
        currency: entry.value.currency,
        total: entry.value.amount,
        count: 1,
      })
    }
  }

  return [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency))
}

/** Ejemplares sin valoración anotada. */
export function unvaluedCount(entries: CollectionEntry[]): number {
  return entries.filter((entry) => !entry.value).length
}


/** Material sin registrar en el catálogo de Numista. */
const UNKNOWN_MATERIAL = 'Sin especificar'

/**
 * Reparto por familia de material, de la más presente a la menos.
 *
 * Agrupa por familia de limpieza y no por la composición exacta de Numista:
 * el criterio, incluida la regla de que una moneda chapada se limpia por su
 * capa y no por su núcleo, vive en `materialFamily`.
 */
export function materialTallies(entries: CollectionEntry[]): Tally[] {
  const counts = new Map<string, number>()

  for (const entry of entries) {
    const familia = materialFamily(entry.material) ?? UNKNOWN_MATERIAL
    counts.set(familia, (counts.get(familia) ?? 0) + 1)
  }

  const desconocidas = counts.get(UNKNOWN_MATERIAL) ?? 0
  counts.delete(UNKNOWN_MATERIAL)

  const tallies = [...counts.entries()]
    .sort(([aLabel, a], [bLabel, b]) => b - a || aLabel.localeCompare(bLabel, 'es'))
    .map(([label, count]) => ({ label, count }))

  if (desconocidas) tallies.push({ label: UNKNOWN_MATERIAL, count: desconocidas })

  return tallies
}

/** Reparto por estado de conservación, en el orden de la escala de Numista. */
export function gradeTallies(entries: CollectionEntry[]): Tally[] {
  const counts = new Map<GradeCode | null, number>()
  for (const entry of entries) {
    counts.set(entry.grade, (counts.get(entry.grade) ?? 0) + 1)
  }

  const tallies: Tally[] = GRADES.filter((g) => counts.has(g.code)).map((g) => ({
    label: `${g.short} — ${g.name}`,
    count: counts.get(g.code)!,
  }))

  const ungraded = counts.get(null)
  if (ungraded) tallies.push({ label: 'Sin especificar', count: ungraded })

  return tallies
}

/**
 * Reparto por década de emisión, de la más antigua a la más reciente.
 *
 * Se cuenta por el año gregoriano y no por el que lleva la moneda: una
 * israelí fechada 5745 o una egipcia 1404 caerían en décadas inventadas.
 */
export function decadeTallies(entries: CollectionEntry[]): Tally[] {
  const counts = new Map<number, number>()
  let undated = 0

  for (const entry of entries) {
    if (entry.gregorianYear == null) {
      undated += 1
      continue
    }
    const decade = Math.floor(entry.gregorianYear / 10) * 10
    counts.set(decade, (counts.get(decade) ?? 0) + 1)
  }

  const tallies: Tally[] = [...counts.entries()]
    .sort(([a], [b]) => a - b)
    .map(([decade, count]) => ({ label: `${decade}s`, count }))

  if (undated) tallies.push({ label: 'Sin fecha', count: undated })

  return tallies
}

/**
 * Busca un ejemplar ya registrado que sea "el mismo" que el que se quiere
 * agregar: mismo tipo del catálogo y misma emisión.
 *
 * La emisión importa: un ½ Centésimo de 1962 y otro de 1963 comparten el
 * número KM pero son monedas distintas. Dos ejemplares sin emisión
 * identificada del mismo tipo sí cuentan como el mismo, porque no hay forma
 * de distinguirlos con lo que se registró.
 *
 * Es el espejo en el cliente del índice `coins_items_sin_duplicados`, que es
 * quien garantiza la regla de verdad.
 */
export function findDuplicate(
  entries: CollectionEntry[],
  candidate: { numistaId: number; numistaIssueId: number | null },
): CollectionEntry | null {
  return (
    entries.find(
      (entry) =>
        entry.numistaId === candidate.numistaId &&
        entry.numistaIssueId === candidate.numistaIssueId,
    ) ?? null
  )
}

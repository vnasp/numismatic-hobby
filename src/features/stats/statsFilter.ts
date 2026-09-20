import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { gradeLabel, type GradeCode } from '../../lib/grades'
import { materialFamily } from '../../lib/materials'
import {
  UNKNOWN_CONTINENT,
  UNKNOWN_COUNTRY,
  UNKNOWN_MATERIAL,
  cartonFor,
} from '../collection/collectionData'
import type { CollectionEntry } from '../collection/useCollection'

/**
 * El cruce de la pantalla de estadísticas.
 *
 * Cada dimensión es un filtro suelto y todas se aplican a la vez, que es lo
 * que permite preguntar cosas como "¿cuántas de América miden 25 mm?": se
 * elige América en el gráfico de continentes y se lee el de tamaños, o al
 * revés. No hay una consulta especial para cada cruce posible; hay un
 * subconjunto y todos los gráficos se dibujan sobre él.
 */
export interface StatsFilter {
  continent: string | null
  country: string | null
  /** Familia de material, con la etiqueta que muestra el gráfico. */
  material: string | null
  /** Etiqueta del cartón: `25 mm`, o el grupo de las más grandes. */
  carton: string | null
  /** Código de conservación, o `sin` para las que no lo tienen anotado. */
  grade: string | null
  fromYear: number | null
  toYear: number | null
}

export const EMPTY_FILTER: StatsFilter = {
  continent: null,
  country: null,
  material: null,
  carton: null,
  grade: null,
  fromYear: null,
  toYear: null,
}

/** Qué dimensión guarda cada parámetro de la URL. */
const PARAMS = {
  continent: 'continente',
  country: 'pais',
  material: 'material',
  carton: 'tamano',
  grade: 'conservacion',
  fromYear: 'desde',
  toYear: 'hasta',
} as const

export type StatsDimension = keyof typeof PARAMS

/** Valor del filtro de conservación para las monedas sin grado anotado. */
export const UNGRADED = 'sin'

/** La familia de material de una moneda, con la etiqueta que usa el gráfico. */
export function materialOf(entry: CollectionEntry): string {
  return materialFamily(entry.material) ?? UNKNOWN_MATERIAL
}

/** Deja sólo las monedas que cumplen todas las dimensiones a la vez. */
export function applyStatsFilter(
  entries: CollectionEntry[],
  filter: StatsFilter,
): CollectionEntry[] {
  return entries.filter((entry) => {
    if (filter.continent && (entry.continent ?? UNKNOWN_CONTINENT) !== filter.continent) {
      return false
    }
    if (filter.country && (entry.issuerName ?? UNKNOWN_COUNTRY) !== filter.country) return false
    if (filter.material && materialOf(entry) !== filter.material) return false
    if (filter.carton && cartonFor(entry.diameterMm) !== filter.carton) return false
    if (filter.grade && (entry.grade ?? UNGRADED) !== filter.grade) return false

    // Las monedas sin fecha quedan fuera en cuanto se acota el rango: no hay
    // forma honesta de decidir si caen dentro, y colarlas inflaría el conteo.
    if (filter.fromYear != null || filter.toYear != null) {
      if (entry.gregorianYear == null) return false
      if (filter.fromYear != null && entry.gregorianYear < filter.fromYear) return false
      if (filter.toYear != null && entry.gregorianYear > filter.toYear) return false
    }

    return true
  })
}

export function isFilterActive(filter: StatsFilter): boolean {
  return Object.values(filter).some((value) => value != null)
}

/** Etiqueta legible de un filtro puesto, para el resumen de arriba. */
export function describeFilter(filter: StatsFilter): { dimension: StatsDimension; label: string }[] {
  const chips: { dimension: StatsDimension; label: string }[] = []

  if (filter.continent) chips.push({ dimension: 'continent', label: filter.continent })
  if (filter.country) chips.push({ dimension: 'country', label: filter.country })
  if (filter.material) chips.push({ dimension: 'material', label: filter.material })
  if (filter.carton) chips.push({ dimension: 'carton', label: filter.carton })
  if (filter.grade) {
    chips.push({
      dimension: 'grade',
      label: filter.grade === UNGRADED ? 'Sin conservación' : gradeLabel(filter.grade as GradeCode),
    })
  }
  if (filter.fromYear != null || filter.toYear != null) {
    const from = filter.fromYear ?? '…'
    const to = filter.toYear ?? '…'
    chips.push({ dimension: 'fromYear', label: `${from}–${to}` })
  }

  return chips
}

function readYear(raw: string | null): number | null {
  if (!raw) return null
  const year = Number(raw)
  return Number.isInteger(year) ? year : null
}

export interface StatsFilterControls {
  filter: StatsFilter
  /** Pone o quita una dimensión. Pasar el valor que ya está la quita. */
  toggle: (dimension: StatsDimension, value: string | null) => void
  setYears: (from: number | null, to: number | null) => void
  clear: (dimension?: StatsDimension) => void
}

/**
 * El filtro vive en la URL y no en un `useState`.
 *
 * Así un cruce se puede compartir o dejar en un marcador —que es la mitad de
 * la gracia de poder cruzar— y el botón de atrás deshace el último clic en
 * vez de sacar de la pantalla.
 */
export function useStatsFilter(): StatsFilterControls {
  const [params, setParams] = useSearchParams()

  const filter = useMemo<StatsFilter>(
    () => ({
      continent: params.get(PARAMS.continent),
      country: params.get(PARAMS.country),
      material: params.get(PARAMS.material),
      carton: params.get(PARAMS.carton),
      grade: params.get(PARAMS.grade),
      fromYear: readYear(params.get(PARAMS.fromYear)),
      toYear: readYear(params.get(PARAMS.toYear)),
    }),
    [params],
  )

  const write = useCallback(
    (changes: Partial<Record<StatsDimension, string | null>>) => {
      const next = new URLSearchParams(params)
      for (const [dimension, value] of Object.entries(changes)) {
        const key = PARAMS[dimension as StatsDimension]
        if (value) next.set(key, value)
        else next.delete(key)
      }
      setParams(next, { replace: true })
    },
    [params, setParams],
  )

  const toggle = useCallback(
    (dimension: StatsDimension, value: string | null) => {
      const current = params.get(PARAMS[dimension])
      write({ [dimension]: current === value ? null : value })
    },
    [params, write],
  )

  const setYears = useCallback(
    (from: number | null, to: number | null) => {
      write({ fromYear: from == null ? null : String(from), toYear: to == null ? null : String(to) })
    },
    [write],
  )

  const clear = useCallback(
    (dimension?: StatsDimension) => {
      if (dimension === 'fromYear' || dimension === 'toYear') {
        write({ fromYear: null, toYear: null })
        return
      }
      if (dimension) {
        write({ [dimension]: null })
        return
      }
      write({
        continent: null,
        country: null,
        material: null,
        carton: null,
        grade: null,
        fromYear: null,
        toYear: null,
      })
    },
    [write],
  )

  return { filter, toggle, setYears, clear }
}

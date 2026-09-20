import { useMemo, type ReactNode } from 'react'
import {
  CARTONES,
  OVERSIZE_CARTON,
  UNKNOWN_MATERIAL,
  continentTallies,
  countryTallies,
  diameterTallies,
  unvaluedCount,
  valueTotals,
  yearRange,
} from '../collection/collectionData'
import { GRADES } from '../../lib/grades'
import { MATERIAL_FAMILIES } from '../../lib/materials'
import { formatMoney } from '../../lib/money'
import type { CollectionEntry } from '../collection/useCollection'
import { ChartCard, ChartLegend, type ChartDatum } from './charts/ChartCard'
import { CoinSizes } from './charts/CoinSizes'
import { DonutChart } from './charts/DonutChart'
import { SegmentedBar } from './charts/SegmentedBar'
import { Treemap } from './charts/Treemap'
import { YearsArea, type DecadePoint } from './charts/YearsArea'
import { StatsFilterBar } from './StatsFilterBar'
import { RAMP, SERIES_LIMIT, SERIES_OTHER, rampStep, seriesColor } from './palette'
import {
  UNGRADED,
  applyStatsFilter,
  materialOf,
  useStatsFilter,
  type StatsDimension,
  type StatsFilter,
} from './statsFilter'

interface Props {
  entries: CollectionEntry[]
  isLoading: boolean
  error: unknown
  /** El encabezado, que cambia entre la vitrina y la vista con sesión. */
  header: ReactNode
  /**
   * Si se muestra lo que sólo corresponde con sesión: la valoración, las
   * favoritas, el material, los tamaños de cartón y la conservación, más la
   * descarga.
   *
   * Los tres del medio no son secretos —la vitrina ya muestra el grado y la
   * composición en cada ficha— pero puestos juntos y contados dicen otra
   * cosa: cuánto vale el conjunto, cómo está guardado y con qué hay que
   * limpiarlo. Eso es del inventario, no del catálogo, y quien pasa a mirar
   * monedas no necesita saberlo.
   *
   * Lo que queda en la vitrina —continente, país y década— describe la
   * colección: de dónde son las monedas y de cuándo.
   */
  showPrivate?: boolean
  /** La descarga del CSV, que sólo arma la vista con sesión. */
  action?: ReactNode
}

/**
 * Todo lo que no es la dimensión del propio gráfico.
 *
 * Un gráfico filtrado por su propia dimensión se quedaría con una sola
 * categoría —elegir "América" dejaría la dona con un único sector— y no
 * habría forma de cambiarse a otra sin volver a la fila de filtros. Cada
 * gráfico se dibuja entonces con todos los demás filtros aplicados pero sin
 * el suyo: así muestra las alternativas dentro del recorte vigente, que es
 * exactamente lo que hay que ver para cruzar.
 */
function except(filter: StatsFilter, ...dimensions: StatsDimension[]): StatsFilter {
  const relaxed = { ...filter }
  for (const dimension of dimensions) {
    if (dimension === 'fromYear' || dimension === 'toYear') {
      relaxed.fromYear = null
      relaxed.toYear = null
    } else {
      relaxed[dimension] = null
    }
  }
  return relaxed
}

/**
 * Asigna un tono a cada categoría una sola vez, sobre la colección completa.
 *
 * El color tiene que seguir a la categoría y no a su posición en la lista de
 * ahora: si "Plata" es cobre, tiene que seguir siendo cobre después de
 * filtrar por Europa. Calcular los colores sobre lo filtrado repintaría los
 * sobrevivientes en cada clic.
 */
function colorMap(order: string[]): Map<string, string> {
  return new Map(order.map((label, index) => [label, seriesColor(index)]))
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}

export function StatsView({ entries, isLoading, error, header, showPrivate = false, action }: Props) {
  const { filter, toggle, setYears, clear } = useStatsFilter()

  const visible = useMemo(() => applyStatsFilter(entries, filter), [entries, filter])

  // Los colores de identidad salen siempre de la colección entera.
  const continentColors = useMemo(
    () => colorMap(continentTallies(entries).map((t) => t.label)),
    [entries],
  )
  const materialOrder = useMemo<string[]>(() => {
    const present = new Set(entries.map(materialOf))
    const families: string[] = MATERIAL_FAMILIES.filter((family) => present.has(family))
    if (present.has(UNKNOWN_MATERIAL)) families.push(UNKNOWN_MATERIAL)
    // Más allá del sexto tono los colores dejan de distinguirse: el resto se
    // pliega en un gris, que es lo que manda la paleta.
    return families.slice(0, SERIES_LIMIT)
  }, [entries])
  const materialColors = useMemo(() => colorMap(materialOrder), [materialOrder])

  const range = useMemo(() => yearRange(entries), [entries])

  // Cada gráfico sobre el recorte de los demás filtros, menos el suyo.
  const continentData = useMemo<ChartDatum[]>(
    () =>
      continentTallies(applyStatsFilter(entries, except(filter, 'continent'))).map((tally) => ({
        label: tally.label,
        count: tally.count,
        color: continentColors.get(tally.label) ?? SERIES_OTHER,
      })),
    [entries, filter, continentColors],
  )

  const countryData = useMemo(
    () =>
      countryTallies(applyStatsFilter(entries, except(filter, 'country'))).map((tally) => ({
        label: tally.name,
        count: tally.count,
      })),
    [entries, filter],
  )

  const decadePoints = useMemo<DecadePoint[]>(() => {
    const dated = applyStatsFilter(entries, except(filter, 'fromYear')).filter(
      (entry) => entry.gregorianYear != null,
    )
    if (dated.length === 0) return []

    const counts = new Map<number, number>()
    for (const entry of dated) {
      const decade = Math.floor(entry.gregorianYear! / 10) * 10
      counts.set(decade, (counts.get(decade) ?? 0) + 1)
    }

    // Las décadas sin monedas se rellenan con cero: son parte de la historia
    // de la colección y saltárselas falsearía el eje.
    const first = Math.min(...counts.keys())
    const last = Math.max(...counts.keys())
    const points: DecadePoint[] = []
    for (let decade = first; decade <= last; decade += 10) {
      points.push({ decade, count: counts.get(decade) ?? 0 })
    }
    return points
  }, [entries, filter])

  const sizeSlices = useMemo(() => {
    const tallies = diameterTallies(applyStatsFilter(entries, except(filter, 'carton')))
    return tallies
      .filter((tally) => tally.label !== 'Sin diámetro')
      .map((tally) => ({
        label: tally.label,
        count: tally.count,
        mm:
          tally.label === OVERSIZE_CARTON
            ? CARTONES[CARTONES.length - 1] + 3
            : Number(tally.label.replace(' mm', '').replace(',', '.')),
      }))
  }, [entries, filter])

  const materialData = useMemo<ChartDatum[]>(() => {
    const scoped = applyStatsFilter(entries, except(filter, 'material'))
    const counts = new Map<string, number>()
    for (const entry of scoped) {
      const family = materialOf(entry)
      counts.set(family, (counts.get(family) ?? 0) + 1)
    }

    const named = materialOrder
      .filter((family) => counts.has(family))
      .map((family) => ({
        label: family,
        count: counts.get(family)!,
        color: materialColors.get(family) ?? SERIES_OTHER,
      }))

    // Lo que quedó fuera de los seis tonos se junta en un gris. Un séptimo y
    // un octavo color no se distinguirían del resto de todos modos.
    const rest = [...counts.entries()]
      .filter(([family]) => !materialOrder.includes(family))
      .reduce((sum, [, count]) => sum + count, 0)

    return rest > 0
      ? [...named, { label: 'Otras familias', count: rest, color: SERIES_OTHER, inert: true }]
      : named
  }, [entries, filter, materialOrder, materialColors])

  const gradeData = useMemo<ChartDatum[]>(() => {
    const scoped = applyStatsFilter(entries, except(filter, 'grade'))
    const counts = new Map<string, number>()
    for (const entry of scoped) {
      const key = entry.grade ?? UNGRADED
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    const present = GRADES.filter((grade) => counts.has(grade.code))
    const data: ChartDatum[] = present.map((grade, index) => ({
      label: `${grade.short} — ${grade.name}`,
      value: grade.code,
      count: counts.get(grade.code)!,
      color: rampStep(index, present.length),
    }))

    const ungraded = counts.get(UNGRADED)
    if (ungraded) {
      data.push({ label: 'Sin especificar', value: UNGRADED, count: ungraded, color: SERIES_OTHER })
    }
    return data
  }, [entries, filter])

  // Las cifras de arriba sí van sobre el recorte completo: son la respuesta
  // a la pregunta que se acaba de armar con los filtros.
  const visibleRange = useMemo(() => yearRange(visible), [visible])
  const visibleCountries = useMemo(() => countryTallies(visible).length, [visible])
  const totals = useMemo(() => valueTotals(visible), [visible])
  const unvalued = useMemo(() => unvaluedCount(visible), [visible])
  const favorites = useMemo(() => visible.filter((entry) => entry.isFavorite).length, [visible])

  const filterProps = {
    filter,
    toggle,
    setYears,
    clear,
    showPrivate,
    continents: continentData.map((d) => d.label),
    countries: countryData.map((d) => d.label),
    materials: materialData.filter((d) => !d.inert).map((d) => d.label),
    cartons: sizeSlices.map((s) => s.label),
    grades: gradeData.map((d) => d.value ?? d.label),
    range,
  }

  return (
    <main className="app__main stack">
      <div className="page-hero">{header}</div>

      {isLoading && <p className="notice">Cargando colección…</p>}
      {error != null && (
        <p className="alert alert--error" role="alert">
          {(error as Error).message}
        </p>
      )}

      {!isLoading && entries.length === 0 && !error && (
        <div className="notice">
          <p className="notice__title">Todavía no hay nada que contar</p>
          <p>Las estadísticas aparecen en cuanto haya monedas en la colección.</p>
        </div>
      )}

      {entries.length > 0 && (
        <>
          <StatsFilterBar {...filterProps} />

          <ul className="figures">
            <li className="figure">
              <span className="figure__value">{visible.length}</span>
              <span className="figure__label">
                {visible.length === entries.length ? 'Monedas' : `de ${entries.length} monedas`}
              </span>
            </li>
            <li className="figure">
              <span className="figure__value">{visibleCountries}</span>
              <span className="figure__label">{visibleCountries === 1 ? 'País' : 'Países'}</span>
            </li>
            <li className="figure">
              <span className="figure__value figure__value--range">
                {visibleRange ? `${visibleRange.from}–${visibleRange.to}` : '—'}
              </span>
              <span className="figure__label">Años</span>
            </li>
            {showPrivate && (
              <li className="figure">
                <span className="figure__value">{favorites}</span>
                <span className="figure__label">Favoritas</span>
              </li>
            )}
          </ul>

          {action}

          {visible.length === 0 && (
            <div className="notice">
              <p className="notice__title">Ninguna moneda cumple ese cruce</p>
              <p>Quita alguno de los filtros de arriba para volver a ver números.</p>
            </div>
          )}

          {/* Las valoraciones se anotan a mano, así que puede haber monedas sin
              valor y valores en distintas monedas. Cada una lleva su total: no
              hay tipo de cambio con que sumarlas. */}
          {showPrivate && (totals.length > 0 || unvalued < visible.length) && (
            <section className="card stats__section">
              <h2>Valoración</h2>
              <ul className="figures">
                {totals.map((total) => (
                  <li className="figure" key={total.currency}>
                    <span className="figure__value figure__value--money">
                      {formatMoney(total.total, total.currency)}
                    </span>
                    <span className="figure__label">
                      {plural(total.count, 'moneda valorada', 'monedas valoradas')}
                    </span>
                  </li>
                ))}
                <li className="figure">
                  <span className="figure__value">{unvalued}</span>
                  <span className="figure__label">Sin valorar</span>
                </li>
              </ul>
            </section>
          )}

          {continentData.length > 1 && (
            <ChartCard title="Por continente" data={continentData} column="Continente">
              <DonutChart
                data={continentData}
                selected={filter.continent}
                onSelect={(value) => toggle('continent', value)}
                total={continentData.reduce((sum, d) => sum + d.count, 0)}
                totalLabel="Monedas"
              />
              <ChartLegend
                data={continentData}
                selected={filter.continent}
                onSelect={(value) => toggle('continent', value)}
              />
            </ChartCard>
          )}

          {decadePoints.length > 1 && (
            <ChartCard
              title="Por década"
              hint="Por el año gregoriano: una israelí fechada 5745 cuenta en los 1980."
              data={decadePoints.map((point) => ({
                label: `${point.decade}s`,
                count: point.count,
                color: RAMP[4],
              }))}
              column="Década"
            >
              <YearsArea
                points={decadePoints}
                selected={
                  filter.fromYear != null && filter.toYear === filter.fromYear + 9
                    ? filter.fromYear
                    : null
                }
                onSelect={(decade) =>
                  filter.fromYear === decade
                    ? setYears(null, null)
                    : setYears(decade, decade + 9)
                }
              />
            </ChartCard>
          )}

          {countryData.length > 1 && (
            <ChartCard
              title="Por país"
              hint="Cada baldosa ocupa lo que le toca por su número de monedas."
              data={countryData.map((item) => ({ ...item, color: RAMP[3] }))}
              column="País"
            >
              <Treemap
                items={countryData}
                selected={filter.country}
                onSelect={(label) => toggle('country', label)}
              />
            </ChartCard>
          )}

          {showPrivate && sizeSlices.length > 0 && (
            <ChartCard
              title="Por tamaño de cartón"
              hint="Cada moneda cuenta en la ventana de cartón más chica en la que entra, y los discos están a escala."
              data={sizeSlices.map((slice, index) => ({
                label: slice.label,
                count: slice.count,
                color: rampStep(index, sizeSlices.length),
              }))}
              column="Ventana"
            >
              <CoinSizes
                slices={sizeSlices}
                selected={filter.carton}
                onSelect={(label) => toggle('carton', label)}
              />
            </ChartCard>
          )}

          {showPrivate && materialData.length > 1 && (
            <ChartCard
              title="Por material"
              hint="Agrupado por familia de limpieza: lo que decide es la capa exterior, no el núcleo."
              data={materialData}
              column="Familia"
            >
              <SegmentedBar
                data={materialData}
                selected={filter.material}
                onSelect={(value) => toggle('material', value)}
              />
              <ChartLegend
                data={materialData}
                selected={filter.material}
                onSelect={(value) => toggle('material', value)}
              />
            </ChartCard>
          )}

          {showPrivate && gradeData.length > 1 && (
            <ChartCard
              title="Por conservación"
              hint="En el orden de la escala de Numista, de la más gastada a la sin circular."
              data={gradeData}
              column="Grado"
            >
              <SegmentedBar
                data={gradeData}
                selected={filter.grade}
                onSelect={(value) => toggle('grade', value)}
              />
              <ChartLegend
                data={gradeData}
                selected={filter.grade}
                onSelect={(value) => toggle('grade', value)}
              />
            </ChartCard>
          )}
        </>
      )}
    </main>
  )
}

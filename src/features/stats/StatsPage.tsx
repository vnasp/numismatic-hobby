import { useMemo } from 'react'
import { AccountMenu } from '../shell/AccountMenu'
import { PageHeader } from '../shell/PageHeader'
import {
  countryTallies,
  decadeTallies,
  diameterTallies,
  gradeTallies,
  materialTallies,
  unvaluedCount,
  valueTotals,
  type Tally,
} from '../collection/collectionData'
import { formatMoney } from '../../lib/money'
import { useCollection } from '../collection/useCollection'

function TallySection({
  title,
  tallies,
  hint,
}: {
  title: string
  tallies: Tally[]
  /** Una línea para explicar cómo se agrupó, cuando no es evidente. */
  hint?: string
}) {
  if (tallies.length === 0) return null
  const max = Math.max(...tallies.map((t) => t.count))

  return (
    <section className="card stats__section">
      <h2>{title}</h2>
      {hint && <p className="stats__hint">{hint}</p>}
      <ul className="tally-list">
        {tallies.map((tally) => (
          <li key={tally.label}>
            <div className="tally">
              <span className="tally__label">{tally.label}</span>
              <span className="tally__count">{tally.count}</span>
              <span
                className="tally__bar"
                style={{ inlineSize: `${(tally.count / max) * 100}%` }}
                aria-hidden="true"
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function StatsPage() {
  const { data, isLoading, error } = useCollection()
  const entries = useMemo(() => data ?? [], [data])

  const countries = useMemo(() => countryTallies(entries), [entries])
  const grades = useMemo(() => gradeTallies(entries), [entries])
  const decades = useMemo(() => decadeTallies(entries), [entries])
  const materials = useMemo(() => materialTallies(entries), [entries])
  const diameters = useMemo(() => diameterTallies(entries), [entries])
  const favorites = useMemo(() => entries.filter((e) => e.isFavorite).length, [entries])
  const totals = useMemo(() => valueTotals(entries), [entries])
  const unvalued = useMemo(() => unvaluedCount(entries), [entries])

  return (
    <main className="app__main stack">
      <div className="page-hero">
        <PageHeader title="Estadísticas" action={<AccountMenu />} />
      </div>

      {isLoading && <p className="notice">Cargando colección…</p>}
      {error && (
        <p className="alert alert--error" role="alert">
          {(error as Error).message}
        </p>
      )}

      {data && entries.length === 0 && (
        <div className="notice">
          <p className="notice__title">Todavía no hay nada que contar</p>
          <p>Agrega tu primera moneda y las estadísticas aparecerán aquí.</p>
        </div>
      )}

      {entries.length > 0 && (
        <>
          <ul className="figures">
            <li className="figure">
              <span className="figure__value">{entries.length}</span>
              <span className="figure__label">Monedas</span>
            </li>
            <li className="figure">
              <span className="figure__value">{countries.length}</span>
              <span className="figure__label">Países</span>
            </li>
            <li className="figure">
              <span className="figure__value">{favorites}</span>
              <span className="figure__label">Favoritas</span>
            </li>
          </ul>

          {/* Las valoraciones se anotan a mano, así que puede haber monedas sin
              valor y valores en distintas monedas. Cada una lleva su total: no
              hay tipo de cambio con que sumarlas. */}
          {(totals.length > 0 || unvalued < entries.length) && (
            <section className="card stats__section">
              <h2>Valoración</h2>
              <ul className="figures">
                {totals.map((total) => (
                  <li className="figure" key={total.currency}>
                    <span className="figure__value figure__value--money">
                      {formatMoney(total.total, total.currency)}
                    </span>
                    <span className="figure__label">
                      {total.count === 1 ? '1 moneda valorada' : `${total.count} monedas valoradas`}
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

          <TallySection title="Por país" tallies={countries.map((c) => ({ label: c.name, count: c.count }))} />
          <TallySection title="Por década" tallies={decades} />
          <TallySection title="Por material" tallies={materials} />
          <TallySection
            title="Por diámetro"
            tallies={diameters}
            hint="Cada moneda cuenta en la ventana de cartón más chica en la que entra."
          />
          <TallySection title="Por conservación" tallies={grades} />
        </>
      )}
    </main>
  )
}

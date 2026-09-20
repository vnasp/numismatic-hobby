import type { ReactNode } from 'react'

export interface ChartDatum {
  label: string
  count: number
  color: string
  /** El valor con el que se filtra al pulsar. Por defecto, la etiqueta. */
  value?: string
  /**
   * Un grupo que no es una categoría de verdad —el "Otros" donde se junta la
   * cola—, así que se dibuja pero no se puede filtrar por él: no hay ningún
   * valor que pedirle a los datos.
   */
  inert?: boolean
}

interface Props {
  title: string
  /** Una línea para explicar cómo se agrupó, cuando no es evidente. */
  hint?: string
  /** Los datos del gráfico, para la tabla de respaldo. */
  data: ChartDatum[]
  /** Encabezado de la primera columna de esa tabla. */
  column: string
  children: ReactNode
}

/**
 * El marco de cada gráfico: título, la línea de contexto, el dibujo y —
 * plegada— la tabla con los mismos números.
 *
 * La tabla no es un extra: un gráfico es una forma de leer, no la única, y
 * quien navega con lector de pantalla, quien no distingue dos tonos o quien
 * simplemente quiere el número exacto tiene que poder llegar a él sin pasar
 * por el dibujo. Por eso va siempre, en todos los gráficos, y no sólo en los
 * que quedaron apretados.
 */
export function ChartCard({ title, hint, data, column, children }: Props) {
  const total = data.reduce((sum, item) => sum + item.count, 0)

  return (
    <section className="card stats__section">
      <h2>{title}</h2>
      {hint && <p className="stats__hint">{hint}</p>}
      {children}

      <details className="chart-table">
        <summary className="chart-table__summary">Ver los números</summary>
        <table className="chart-table__table">
          <thead>
            <tr>
              <th scope="col">{column}</th>
              <th scope="col">Monedas</th>
              <th scope="col">Parte</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.label}>
                <th scope="row">{item.label}</th>
                <td>{item.count}</td>
                <td>{total ? `${Math.round((item.count / total) * 100)} %` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}

/**
 * La leyenda: un cuadrito del color, la etiqueta y el número.
 *
 * Va siempre que el gráfico use más de un tono, y lleva el valor al lado
 * porque así la identidad nunca depende sólo del color. Cada fila es además
 * el botón que aplica el filtro: es donde la mano va a buscar cuando el
 * sector de la dona es demasiado fino para acertarle.
 */
export function ChartLegend({
  data,
  selected,
  onSelect,
}: {
  data: ChartDatum[]
  selected: string | null
  onSelect: (value: string) => void
}) {
  return (
    <ul className="chart-legend">
      {data.map((item) => {
        const value = item.value ?? item.label
        const active = selected === value
        return (
          <li key={item.label}>
            <button
              type="button"
              className={`chart-legend__item${active ? ' chart-legend__item--active' : ''}`}
              aria-pressed={item.inert ? undefined : active}
              disabled={item.inert}
              onClick={() => onSelect(value)}
            >
              <span
                className="chart-legend__swatch"
                style={{ background: item.color }}
                aria-hidden="true"
              />
              <span className="chart-legend__label">{item.label}</span>
              <span className="chart-legend__count">{item.count}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

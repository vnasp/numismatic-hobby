import { useChartWidth } from './useChartWidth'

const HEIGHT = 220
const PAD = { top: 18, right: 16, bottom: 30, left: 34 }
const PLOT_H = HEIGHT - PAD.top - PAD.bottom

export interface DecadePoint {
  decade: number
  count: number
}

interface Props {
  points: DecadePoint[]
  /** La década elegida, si el filtro de años coincide justo con una. */
  selected: number | null
  onSelect: (decade: number) => void
}

/** Escalones limpios para el eje: 1, 2, 5, 10, 20, 50… */
function niceTop(max: number): number {
  if (max <= 5) return Math.max(max, 1)
  const magnitude = 10 ** Math.floor(Math.log10(max))
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = step * magnitude
    if (candidate >= max) return candidate
  }
  return 10 * magnitude
}

/**
 * La colección en el tiempo, por década de emisión.
 *
 * Es el único gráfico con eje horizontal continuo, y por eso es de área y no
 * de barras: las décadas sin ninguna moneda se dibujan como el hueco que
 * son. Una lista de barras se saltaría los 1940 vacíos y haría parecer que
 * los 1930 y los 1950 son vecinos.
 *
 * Una sola serie, así que no lleva leyenda —el título ya dice qué se cuenta—
 * y se etiqueta sólo la década más alta: un número sobre cada punto sería
 * ruido y nadie lo lee.
 */
export function YearsArea({ points, selected, onSelect }: Props) {
  // El hook va antes de cualquier salida: es la regla de los hooks.
  const { ref, width } = useChartWidth()
  if (points.length === 0) return <div ref={ref} />

  const WIDTH = width
  const PLOT_W = WIDTH - PAD.left - PAD.right

  const top = niceTop(Math.max(...points.map((p) => p.count)))
  const peak = points.reduce((best, p) => (p.count > best.count ? p : best), points[0])

  // Con una sola década el ancho de banda sería infinito: se le da el plot
  // entero y el punto queda al medio.
  const band = points.length > 1 ? PLOT_W / (points.length - 1) : PLOT_W
  const x = (index: number) =>
    points.length > 1 ? PAD.left + index * band : PAD.left + PLOT_W / 2
  const y = (count: number) => PAD.top + PLOT_H - (count / top) * PLOT_H

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.count)}`).join(' ')
  const area = `${line} L ${x(points.length - 1)} ${PAD.top + PLOT_H} L ${x(0)} ${PAD.top + PLOT_H} Z`

  // Con muchas décadas no caben todas las etiquetas del eje: se muestra una
  // de cada n, siempre incluyendo la primera y la última.
  const every = Math.ceil(points.length / 7)

  return (
    <div ref={ref}>
    <svg
      className="chart-svg"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Monedas por década: ${points
        .map((p) => `${p.decade}, ${p.count}`)
        .join('; ')}`}
    >
      {[0, 0.5, 1].map((fraction) => {
        const value = top * fraction
        return (
          <g key={fraction}>
            <line
              className="chart-grid"
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(value)}
              y2={y(value)}
            />
            <text className="chart-tick" x={PAD.left - 8} y={y(value) + 4} textAnchor="end">
              {value}
            </text>
          </g>
        )
      })}

      <path className="chart-area" d={area} />
      <path className="chart-line" d={line} />

      {points.map((point, index) => {
        const active = selected === point.decade
        return (
          <g
            key={point.decade}
            className={`chart-hit${active ? ' chart-hit--active' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={`${point.decade}s: ${point.count} monedas`}
            onClick={() => onSelect(point.decade)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(point.decade)
              }
            }}
          >
            <title>{`${point.decade}s: ${point.count}`}</title>
            {/* El blanco de clic es la columna entera, no el punto: apuntarle
                a un círculo de 4 px con el pulgar no funciona. */}
            <rect
              className="chart-hit__target"
              x={x(index) - band / 2}
              y={PAD.top}
              width={Math.max(band, 24)}
              height={PLOT_H}
            />
            <circle className="chart-dot" cx={x(index)} cy={y(point.count)} r={active ? 5 : 3.5} />
          </g>
        )
      })}

      <text
        className="chart-value"
        x={x(points.indexOf(peak))}
        y={y(peak.count) - 10}
        textAnchor="middle"
      >
        {peak.count}
      </text>

      {points.map((point, index) =>
        index % every === 0 || index === points.length - 1 ? (
          <text
            key={point.decade}
            className="chart-tick"
            x={x(index)}
            y={HEIGHT - 10}
            textAnchor="middle"
          >
            {`${point.decade}s`}
          </text>
        ) : null,
      )}
    </svg>
    </div>
  )
}

import type { ChartDatum } from './ChartCard'

const SIZE = 200
const RADIUS = 78
/** Grosor del anillo. Fino a propósito: el dato es el ángulo, no el bloque. */
const THICKNESS = 22
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
/** Separación entre sectores, en píxeles de arco: la hace el fondo, no un borde. */
const GAP = 3

interface Props {
  data: ChartDatum[]
  selected: string | null
  onSelect: (value: string) => void
  /** Qué va en el hueco del centro: el total y su unidad. */
  total: number
  totalLabel: string
}

/**
 * Anillo de partes de un todo.
 *
 * Sirve acá porque los continentes son pocos (cinco y medio) y la pregunta
 * es de reparto, no de comparación fina: se lee "casi la mitad es América"
 * de una ojeada. Con más categorías o con valores parecidos habría que
 * volver a las barras —una dona no sirve para distinguir 18% de 21%—, y por
 * eso la leyenda lleva siempre el número al lado.
 *
 * El hueco del centro no es decoración: es donde va el total, que es el dato
 * que la dona no puede mostrar.
 */
export function DonutChart({ data, selected, onSelect, total, totalLabel }: Props) {
  const sum = data.reduce((acc, item) => acc + item.count, 0)
  if (sum === 0) return null

  // Los desplazamientos se calculan antes de dibujar y no acumulando dentro
  // del map: el arco de cada sector depende de dónde terminó el anterior, y
  // un acumulador vivo durante el render es justo lo que se rompe cuando
  // React vuelve a ejecutar la función.
  const offsets = data.reduce<number[]>((acc, _item, index) => {
    acc.push(index === 0 ? 0 : acc[index - 1] + (data[index - 1].count / sum) * CIRCUMFERENCE)
    return acc
  }, [])

  return (
    <div className="donut">
      <svg
        className="donut__svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Reparto por ${totalLabel.toLowerCase()}: ${data
          .map((item) => `${item.label}, ${item.count}`)
          .join('; ')}`}
      >
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {data.map((item, index) => {
            const value = item.value ?? item.label
            const length = (item.count / sum) * CIRCUMFERENCE
            const dash = Math.max(length - GAP, 1)
            const dimmed = selected != null && selected !== value

            return (
              <circle
                key={item.label}
                className={`donut__arc${dimmed ? ' donut__arc--dimmed' : ''}`}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={item.color}
                strokeWidth={THICKNESS}
                strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                strokeDashoffset={-offsets[index]}
                onClick={() => onSelect(value)}
              >
                <title>{`${item.label}: ${item.count}`}</title>
              </circle>
            )
          })}
        </g>

        <text className="donut__total" x={SIZE / 2} y={SIZE / 2 - 2} textAnchor="middle">
          {total}
        </text>
        <text className="donut__caption" x={SIZE / 2} y={SIZE / 2 + 18} textAnchor="middle">
          {totalLabel}
        </text>
      </svg>
    </div>
  )
}

import { squarify, type TreemapItem } from './treemapLayout'
import { useChartWidth } from './useChartWidth'
import { SERIES } from '../palette'

/** La separación entre baldosas la hace el fondo, nunca un borde dibujado. */
const GAP = 2

interface Props {
  items: TreemapItem[]
  selected: string | null
  onSelect: (label: string) => void
}

/** El nombre sólo entra si la baldosa le deja aire por los cuatro lados. */
function fits(cell: { w: number; h: number }, label: string) {
  return cell.h >= 34 && cell.w >= label.length * 6.2 + 16
}

/**
 * Los países como un mosaico: cada baldosa ocupa el área que le toca por su
 * número de monedas.
 *
 * Es la misma información que la lista de barras de la pestaña Países, pero
 * leída de otra manera: en una lista de treinta barras la cola se vuelve un
 * borrón, y acá el reparto completo cabe de una vez y se ve al tiro cuáles
 * dos o tres países son la mitad de la colección.
 *
 * Todas las baldosas son del mismo oro a propósito. El tamaño ya dice cuánto
 * hay; darle además un tono distinto a cada país sería repetir el mismo dato
 * en el único canal que quedaba libre, y treinta tonos no se distinguen de
 * todos modos. El color se reserva para marcar cuál está filtrado.
 */
export function Treemap({ items, selected, onSelect }: Props) {
  const { ref, width } = useChartWidth()

  // Más alto en proporción cuando la pantalla es angosta: con el alto atado
  // al ancho, en el teléfono el mosaico quedaba una franja de 150 px donde
  // no cabía ningún nombre.
  const height = Math.round(Math.max(240, Math.min(320, width * 0.52)))
  const cells = squarify(items, width, height)

  return (
    <div ref={ref}>
    {cells.length > 0 && (
    <svg
      className="chart-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Monedas por país: ${items
        .map((item) => `${item.label}, ${item.count}`)
        .join('; ')}`}
    >
      {cells.map((cell) => {
        const active = selected === cell.label
        const dimmed = selected != null && !active
        const w = Math.max(cell.w - GAP, 1)
        const h = Math.max(cell.h - GAP, 1)

        return (
          <g
            key={cell.label}
            className={`treemap__cell${dimmed ? ' treemap__cell--dimmed' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={`${cell.label}: ${cell.count} monedas`}
            onClick={() => onSelect(cell.label)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(cell.label)
              }
            }}
          >
            <title>{`${cell.label}: ${cell.count}`}</title>
            <rect
              x={cell.x}
              y={cell.y}
              width={w}
              height={h}
              rx="3"
              fill={active ? 'var(--gold-bright)' : SERIES[0]}
            />
            {/* Sin espacio para el nombre no se recorta: el número queda si
                cabe, y el nombre lo lleva el tooltip y la tabla. */}
            {fits({ w, h }, cell.label) ? (
              <>
                <text className="treemap__label" x={cell.x + 8} y={cell.y + 19}>
                  {cell.label}
                </text>
                <text className="treemap__value" x={cell.x + 8} y={cell.y + 34}>
                  {cell.count}
                </text>
              </>
            ) : w >= 26 && h >= 18 ? (
              <text className="treemap__value" x={cell.x + w / 2} y={cell.y + h / 2 + 4} textAnchor="middle">
                {cell.count}
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
    )}
    </div>
  )
}

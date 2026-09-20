import { inkOn } from '../palette'
import type { ChartDatum } from './ChartCard'

interface Props {
  data: ChartDatum[]
  selected: string | null
  onSelect: (value: string) => void
}

/**
 * Una sola barra partida en tramos: el reparto completo en una línea.
 *
 * Es la forma honesta de mostrar partes de un todo cuando las categorías son
 * varias y tienen nombres largos —"Cuproníquel y níquel" no cabe bajo una
 * columna— y cuando lo que importa es la proporción y no comparar dos
 * valores parecidos. Cada tramo lleva su porcentaje adentro si cabe, y la
 * leyenda de abajo lleva siempre el número exacto.
 */
export function SegmentedBar({ data, selected, onSelect }: Props) {
  const total = data.reduce((sum, item) => sum + item.count, 0)
  if (total === 0) return null

  return (
    <div className="segbar" role="img" aria-label={data.map((d) => `${d.label}, ${d.count}`).join('; ')}>
      {data.map((item) => {
        const value = item.value ?? item.label
        const share = (item.count / total) * 100
        const active = selected === value

        return (
          <button
            key={item.label}
            type="button"
            className={`segbar__part${active ? ' segbar__part--active' : ''}${
              selected != null && !active ? ' segbar__part--dimmed' : ''
            }`}
            style={{ flexGrow: item.count, background: item.color }}
            title={`${item.label}: ${item.count}`}
            aria-label={`${item.label}: ${item.count} monedas`}
            aria-pressed={item.inert ? undefined : active}
            disabled={item.inert}
            onClick={() => onSelect(value)}
          >
            {/* Por debajo de un 8% el número no entra sin quedar cortado, y
                un texto recortado es peor que ninguno: se va a la leyenda. */}
            {share >= 8 && (
              <span className="segbar__share" style={{ color: inkOn(item.color) }}>
                {Math.round(share)}%
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

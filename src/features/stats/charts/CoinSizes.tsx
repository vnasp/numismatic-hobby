import { rampStep } from '../palette'

export interface SizeSlice {
  /** La etiqueta del cartón: `25 mm`, o el grupo de las más grandes. */
  label: string
  /** Los milímetros de la ventana, para dibujar el disco a escala. */
  mm: number
  count: number
}

/** Píxeles por milímetro. Con 2,4 el cartón más grande queda en 95 px. */
const SCALE = 2.4

interface Props {
  slices: SizeSlice[]
  selected: string | null
  onSelect: (label: string) => void
}

/**
 * Los tamaños de cartón dibujados a escala: cada disco mide, en pantalla, lo
 * que mide la ventana en el cartón.
 *
 * Una barra por tamaño diría lo mismo, pero este dato se usa para comprar
 * cartones y para eso conviene verlo como lo que es. El disco de 15 mm al
 * lado del de 39,5 mm se compara solo, y de paso se reconoce cuál es cuál
 * sin leer la etiqueta.
 *
 * La escala de color acompaña al orden de los tamaños porque acá el orden sí
 * significa algo —es una escala, no una lista de nombres—, y por eso los
 * discos van del más chico al más grande y no por cantidad.
 */
export function CoinSizes({ slices, selected, onSelect }: Props) {
  if (slices.length === 0) return null

  return (
    <ul className="coin-sizes">
      {slices.map((slice, index) => {
        const active = selected === slice.label
        const diameter = Math.round(slice.mm * SCALE)

        return (
          <li key={slice.label}>
            <button
              type="button"
              className={`coin-size${active ? ' coin-size--active' : ''}${
                selected != null && !active ? ' coin-size--dimmed' : ''
              }`}
              aria-pressed={active}
              onClick={() => onSelect(slice.label)}
            >
              {/* El disco vive en una caja de altura fija para que todas las
                  etiquetas queden alineadas aunque los discos no lo estén. */}
              <span className="coin-size__disc-box">
                <span
                  className="coin-size__disc"
                  style={{
                    inlineSize: `${diameter}px`,
                    blockSize: `${diameter}px`,
                    background: active ? 'var(--gold-bright)' : rampStep(index, slices.length),
                  }}
                  aria-hidden="true"
                />
              </span>
              <span className="coin-size__count">{slice.count}</span>
              <span className="coin-size__label">{slice.label}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

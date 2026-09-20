import { Dropdown } from '../shell/Dropdown'
import { GRADES } from '../../lib/grades'
import { CloseIcon } from '../shell/icons'
import {
  describeFilter,
  isFilterActive,
  type StatsFilterControls,
} from './statsFilter'
import type { YearRange } from '../collection/collectionData'

interface Props extends StatsFilterControls {
  continents: string[]
  countries: string[]
  materials: string[]
  cartons: string[]
  grades: string[]
  /** El rango completo de la colección, que acota los dos campos de año. */
  range: YearRange | null
  /**
   * Sin sesión no se dibujan los gráficos de material, tamaño ni
   * conservación, así que tampoco se ofrecen sus filtros: un desplegable que
   * recorta el resto de la pantalla por algo que no se muestra no se
   * entiende.
   */
  showPrivate: boolean
}

/**
 * La opción neutra va primero y es corta a propósito: en el teléfono caben
 * dos desplegables por fila, y "Todos los continentes" no entra sin
 * recortarse a puntos suspensivos.
 */
function toOptions(values: string[], all: string) {
  return [{ value: '', label: all }, ...values.map((value) => ({ value, label: value }))]
}

/**
 * La fila de filtros, arriba de todos los gráficos.
 *
 * Va una sola fila para toda la pantalla y no un control por tarjeta: si
 * cada gráfico tuviera su propio filtro los números dejarían de cuadrar
 * entre sí, y la gracia de esta pantalla es justamente que todos hablan del
 * mismo subconjunto.
 *
 * Los mismos filtros se ponen pulsando el gráfico. Esta fila existe para
 * llegar a lo que el gráfico no alcanza a mostrar —un país con dos monedas
 * en el mosaico— y para ver de un vistazo qué hay puesto.
 */
export function StatsFilterBar({
  filter,
  toggle,
  setYears,
  clear,
  continents,
  countries,
  materials,
  cartons,
  grades,
  range,
  showPrivate,
}: Props) {
  const chips = describeFilter(filter)

  return (
    <div className="stats-filters">
      <div className="stats-filters__row">
        {continents.length > 1 && (
          <Dropdown
            className="dropdown--pill"
            ariaLabel="Filtrar por continente"
            placeholder="Continente"
            value={filter.continent ?? ''}
            onChange={(value) => toggle('continent', value || null)}
            options={toOptions(continents, 'Todo continente')}
          />
        )}

        <Dropdown
          className="dropdown--pill"
          ariaLabel="Filtrar por país"
          placeholder="País"
          value={filter.country ?? ''}
          onChange={(value) => toggle('country', value || null)}
          options={toOptions(countries, 'Todo país')}
        />

        {showPrivate && (
          <Dropdown
            className="dropdown--pill"
            ariaLabel="Filtrar por material"
            placeholder="Material"
            value={filter.material ?? ''}
            onChange={(value) => toggle('material', value || null)}
            options={toOptions(materials, 'Todo material')}
          />
        )}

        {showPrivate && cartons.length > 0 && (
          <Dropdown
            className="dropdown--pill"
            ariaLabel="Filtrar por tamaño de cartón"
            placeholder="Tamaño"
            value={filter.carton ?? ''}
            onChange={(value) => toggle('carton', value || null)}
            options={toOptions(cartons, 'Todo tamaño')}
          />
        )}

        {showPrivate && (
          <Dropdown
            className="dropdown--pill"
            ariaLabel="Filtrar por conservación"
            placeholder="Conservación"
            value={filter.grade ?? ''}
            onChange={(value) => toggle('grade', value || null)}
            options={[
              { value: '', label: 'Toda conservación' },
              ...GRADES.filter((grade) => grades.includes(grade.code)).map((grade) => ({
                value: grade.code,
                label: `${grade.short} — ${grade.name}`,
              })),
            ]}
          />
        )}

        {range && (
          <div className="stats-filters__years">
            <label className="stats-filters__year">
              <span>Desde</span>
              <input
                type="number"
                inputMode="numeric"
                min={range.from}
                max={range.to}
                placeholder={String(range.from)}
                value={filter.fromYear ?? ''}
                onChange={(event) =>
                  setYears(event.target.value ? Number(event.target.value) : null, filter.toYear)
                }
              />
            </label>
            <label className="stats-filters__year">
              <span>Hasta</span>
              <input
                type="number"
                inputMode="numeric"
                min={range.from}
                max={range.to}
                placeholder={String(range.to)}
                value={filter.toYear ?? ''}
                onChange={(event) =>
                  setYears(filter.fromYear, event.target.value ? Number(event.target.value) : null)
                }
              />
            </label>
          </div>
        )}
      </div>

      {isFilterActive(filter) && (
        <div className="stats-filters__active">
          <ul className="chips">
            {chips.map((chip) => (
              <li key={chip.dimension}>
                <button
                  type="button"
                  className="chip"
                  onClick={() => clear(chip.dimension)}
                  aria-label={`Quitar el filtro ${chip.label}`}
                >
                  {chip.label}
                  <CloseIcon size={14} />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn--ghost" onClick={() => clear()}>
            Limpiar todo
          </button>
        </div>
      )}
    </div>
  )
}

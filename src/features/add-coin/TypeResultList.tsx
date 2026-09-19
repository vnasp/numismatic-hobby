import type { NumistaSearchResultType } from '../../../shared/numista/types'
import { numistaTypeUrl } from '../../../shared/numista/urls'

interface Props {
  types: NumistaSearchResultType[]
  onSelect: (type: NumistaSearchResultType) => void
  /** Dónde se buscó, para que el vacío diga en qué catálogo no hay nada. */
  searchedIn?: string
}

function yearRange(type: NumistaSearchResultType): string | null {
  if (!type.min_year) return null
  const end = type.max_year && type.max_year !== type.min_year ? `–${type.max_year}` : ''
  return `${type.min_year}${end}`
}

export function TypeResultList({ types, onSelect, searchedIn = 'ni en KM ni en Y#' }: Props) {
  if (types.length === 0) {
    return (
      <div className="notice">
        <p className="notice__title">Sin resultados</p>
        <p>No se encontraron monedas con ese número, {searchedIn}.</p>
      </div>
    )
  }

  return (
    <ul className="result-list">
      {types.map((type) => {
        // El anverso suele repetir el mismo busto en toda una serie, así que
        // no distingue una moneda de otra: se muestra el reverso y sólo se cae
        // al anverso cuando Numista no tiene foto de ese lado.
        const thumbnail = type.reverse_thumbnail ?? type.obverse_thumbnail
        const years = yearRange(type)

        return (
          <li className="result" key={type.id}>
            <button type="button" className="result__pick" onClick={() => onSelect(type)}>
              {thumbnail && (
                <img
                  className="result__img"
                  src={thumbnail}
                  alt=""
                  width={56}
                  height={56}
                  loading="lazy"
                />
              )}
              <span className="result__text">
                <span className="result__title">{type.title}</span>
                {type.issuer?.name && <span className="result__issuer">{type.issuer.name}</span>}
                {years && <span className="result__years">{years}</span>}
              </span>
            </button>
            {/* Va fuera del botón a propósito: anidar un enlace dentro de un
                botón es HTML inválido y rompe la navegación por teclado. */}
            <a
              className="result__link"
              href={numistaTypeUrl(type)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Ver ${type.title} en Numista`}
            >
              Numista ↗
            </a>
          </li>
        )
      })}
    </ul>
  )
}

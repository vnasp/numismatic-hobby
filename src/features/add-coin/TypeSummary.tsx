import type { NumistaType } from '../../../shared/numista/types'
import { formatReference, preferredReference } from '../../../shared/numista/references'
import { typeFacts, typeYears } from './typeFacts'

interface Props {
  type: NumistaType
}

/**
 * Ficha de la moneda elegida del catálogo.
 *
 * Los datos físicos (composición, diámetro, peso) sólo existen en
 * `GET /types/{id}`, no en el listado de búsqueda, así que este resumen se
 * muestra una vez cargado el tipo. Pedirlos para cada resultado gastaría una
 * llamada de cuota por moneda listada.
 */
export function TypeSummary({ type }: Props) {
  const thumbnail = type.reverse?.thumbnail ?? type.obverse?.thumbnail
  const reference = preferredReference(type.references)
  const years = typeYears(type)
  const facts = typeFacts(type)

  return (
    <article className="type-summary">
      {thumbnail && (
        <span className="type-summary__disc">
          <img className="type-summary__img" src={thumbnail} alt="" width={72} height={72} />
        </span>
      )}
      <div className="type-summary__text">
        <h3 className="type-summary__title">{type.title}</h3>
        {type.issuer?.name && <p className="type-summary__line">{type.issuer.name}</p>}
        {reference && <p className="type-summary__line">{formatReference(reference)}</p>}
        {years && <p className="type-summary__line">{years}</p>}

        {facts.length > 0 && (
          <ul className="type-summary__facts">
            {facts.map((fact) => (
              <li key={fact} className="chip">
                {fact}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}

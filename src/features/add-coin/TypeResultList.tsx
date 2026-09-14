import type { NumistaType } from '../../../shared/numista/types'
import { extractKmNumber } from '../../../shared/numista/references'

interface Props {
  types: NumistaType[]
  onSelect: (type: NumistaType) => void
}

export function TypeResultList({ types, onSelect }: Props) {
  if (types.length === 0) {
    return <p>No se encontraron monedas con ese número KM.</p>
  }

  return (
    <ul>
      {types.map((type) => (
        <li key={type.id}>
          <button type="button" onClick={() => onSelect(type)}>
            {type.obverse?.thumbnail && (
              <img src={type.obverse.thumbnail} alt="" width={60} height={60} />
            )}
            <span>{type.title}</span>
            <span>{type.issuer?.name}</span>
            <span>
              {type.min_year}
              {type.max_year && type.max_year !== type.min_year ? `–${type.max_year}` : ''}
            </span>
            {extractKmNumber(type.references) && (
              <span>KM #{extractKmNumber(type.references)}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}

import type { NumistaSearchResultType } from '../../../shared/numista/types'

interface Props {
  types: NumistaSearchResultType[]
  onSelect: (type: NumistaSearchResultType) => void
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
            {type.obverse_thumbnail && (
              <img src={type.obverse_thumbnail} alt="" width={60} height={60} />
            )}
            <span>{type.title}</span>
            <span>{type.issuer?.name}</span>
            <span>
              {type.min_year}
              {type.max_year && type.max_year !== type.min_year ? `–${type.max_year}` : ''}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

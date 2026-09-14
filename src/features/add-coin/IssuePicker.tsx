import type { NumistaIssue } from '../../../shared/numista/types'
import { extractKmNumber } from '../../../shared/numista/references'

interface Props {
  issues: NumistaIssue[]
  selectedId: number | null
  onSelect: (issueId: number | null) => void
}

export function IssuePicker({ issues, selectedId, onSelect }: Props) {
  return (
    <fieldset>
      <legend>Emisión</legend>
      <p>
        Elige el año y ceca exactos de tu moneda. Sin emisión no se puede
        obtener el valor estimado.
      </p>
      <ul>
        {issues.map((issue) => (
          <li key={issue.id}>
            <label>
              <input
                type="radio"
                name="issue"
                checked={selectedId === issue.id}
                onChange={() => onSelect(issue.id)}
              />
              {issue.year ?? 'Sin fecha'}
              {issue.mint_letter ? ` · Ceca ${issue.mint_letter}` : ''}
              {issue.mintage ? ` · Tirada ${issue.mintage.toLocaleString('es')}` : ''}
              {extractKmNumber(issue.references) ? ` · KM #${extractKmNumber(issue.references)}` : ''}
              {issue.comment ? ` · ${issue.comment}` : ''}
            </label>
          </li>
        ))}
        <li>
          <label>
            <input
              type="radio"
              name="issue"
              checked={selectedId === null}
              onChange={() => onSelect(null)}
            />
            No estoy segura de la emisión
          </label>
        </li>
      </ul>
    </fieldset>
  )
}

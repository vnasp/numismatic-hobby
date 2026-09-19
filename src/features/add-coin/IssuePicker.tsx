import type { NumistaIssue } from '../../../shared/numista/types'
import { issueLabel } from './typeFacts'
import { IssueHelp } from './IssueHelp'

interface Props {
  issues: NumistaIssue[]
  selectedId: number | null
  onSelect: (issueId: number | null) => void
}

export function IssuePicker({ issues, selectedId, onSelect }: Props) {
  return (
    <fieldset className="issue-picker">
      <div className="section-head">
        <legend className="issue-picker__legend">
          Selecciona la emisión de tu ejemplar
        </legend>
        <IssueHelp />
      </div>

      <ul className="issue-list">
        {issues.map((issue) => (
          <li key={issue.id}>
            <label className="issue">
              <input
                type="radio"
                name="issue"
                checked={selectedId === issue.id}
                onChange={() => onSelect(issue.id)}
              />
              <span>{issueLabel(issue)}</span>
            </label>
          </li>
        ))}
        <li>
          <label className="issue">
            <input
              type="radio"
              name="issue"
              checked={selectedId === null}
              onChange={() => onSelect(null)}
            />
            <span>No estoy segura de la emisión</span>
          </label>
        </li>
      </ul>
    </fieldset>
  )
}

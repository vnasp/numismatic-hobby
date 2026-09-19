import type { NumistaIssue, NumistaType } from '../../../shared/numista/types'
import { gradeLabel } from '../../lib/grades'
import { TypeSummary } from './TypeSummary'
import { issueLabel } from './typeFacts'
import type { ItemFormValues } from './ItemForm'

interface Props {
  type: NumistaType
  issue: NumistaIssue | null
  values: ItemFormValues
  isSaving: boolean
  onSave: () => void
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-row">
      <dt className="summary-row__label">{label}</dt>
      <dd className="summary-row__value">{value}</dd>
    </div>
  )
}

/**
 * Última revisión antes de escribir en la colección. Sólo se listan los datos
 * que la usuaria completó: repetir "sin especificar" cuatro veces convierte el
 * resumen en ruido y esconde lo que sí llenó.
 */
export function ConfirmStep({ type, issue, values, isSaving, onSave }: Props) {
  return (
    <>
      <div className="section-head">
        <h2>Confirma lo que vas a guardar</h2>
      </div>

      <div className="card">
        <TypeSummary type={type} />
      </div>

      <div className="card">
        <dl className="summary">
          <Row
            label="Emisión"
            value={issue ? issueLabel(issue) : 'Sin determinar'}
          />
          {values.grade && <Row label="Conservación" value={gradeLabel(values.grade)} />}
          {values.conditionNotes && (
            <Row label="Observaciones" value={values.conditionNotes} />
          )}
          {values.location && <Row label="Ubicación" value={values.location} />}
          {values.notes && <Row label="Notas" value={values.notes} />}
        </dl>
      </div>

      <button
        type="button"
        className="btn btn--primary btn--block"
        onClick={onSave}
        disabled={isSaving}
      >
        {isSaving ? 'Guardando…' : 'Guardar moneda'}
      </button>
    </>
  )
}

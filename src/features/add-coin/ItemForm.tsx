import { useState, type FormEvent } from 'react'
import { GRADES, gradeLabel, type GradeCode } from '../../lib/grades'
import { Dropdown } from '../shell/Dropdown'

export interface ItemFormValues {
  grade: GradeCode | null
  conditionNotes: string
  location: string
  notes: string
}

interface Props {
  onSubmit: (values: ItemFormValues) => void
  isSaving: boolean
  /**
   * Valores con los que arrancar. Hacen falta al volver desde el paso de
   * confirmación: sin ellos, el formulario se remonta vacío y se pierde todo
   * lo que la usuaria ya había escrito.
   */
  initialValues?: ItemFormValues
  submitLabel?: string
  pendingLabel?: string
}

export function ItemForm({
  onSubmit,
  isSaving,
  initialValues,
  submitLabel = 'Guardar moneda',
  pendingLabel = 'Guardando…',
}: Props) {
  const [grade, setGrade] = useState<GradeCode | ''>(initialValues?.grade ?? '')
  const [conditionNotes, setConditionNotes] = useState(initialValues?.conditionNotes ?? '')
  const [location, setLocation] = useState(initialValues?.location ?? '')
  const [notes, setNotes] = useState(initialValues?.notes ?? '')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit({
      grade: grade === '' ? null : grade,
      conditionNotes,
      location,
      notes,
    })
  }

  return (
    <form className="form card" onSubmit={handleSubmit}>
      <div className="field">
        <label className="field__label" htmlFor="grade">
          Estado de conservación
        </label>
        <Dropdown
          id="grade"
          value={grade}
          onChange={(value) => setGrade(value as GradeCode | '')}
          options={[
            { value: '', label: 'Sin especificar' },
            ...GRADES.map((g) => ({ value: g.code, label: gradeLabel(g.code) })),
          ]}
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="conditionNotes">
          Observaciones sobre la conservación
        </label>
        <input
          className="input"
          id="conditionNotes"
          value={conditionNotes}
          onChange={(e) => setConditionNotes(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="location">
          Ubicación física
        </label>
        <input
          className="input"
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Álbum, cajón, cápsula…"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="notes">
          Notas
        </label>
        <textarea
          className="textarea"
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <button type="submit" className="btn btn--primary btn--block" disabled={isSaving}>
        {isSaving ? pendingLabel : submitLabel}
      </button>
    </form>
  )
}

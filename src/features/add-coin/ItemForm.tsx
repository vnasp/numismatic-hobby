import { useState, type FormEvent } from 'react'
import { GRADES, type GradeCode } from '../../lib/grades'

export interface ItemFormValues {
  grade: GradeCode | null
  conditionNotes: string
  location: string
  notes: string
}

interface Props {
  onSubmit: (values: ItemFormValues) => void
  isSaving: boolean
}

export function ItemForm({ onSubmit, isSaving }: Props) {
  const [grade, setGrade] = useState<GradeCode | ''>('')
  const [conditionNotes, setConditionNotes] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')

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
    <form onSubmit={handleSubmit}>
      <label htmlFor="grade">Estado de conservación</label>
      <select
        id="grade"
        value={grade}
        onChange={(e) => setGrade(e.target.value as GradeCode | '')}
      >
        <option value="">Sin especificar</option>
        {GRADES.map((g) => (
          <option key={g.code} value={g.code}>{g.label}</option>
        ))}
      </select>

      <label htmlFor="conditionNotes">Observaciones sobre la conservación</label>
      <input
        id="conditionNotes"
        value={conditionNotes}
        onChange={(e) => setConditionNotes(e.target.value)}
      />

      <label htmlFor="location">Ubicación física</label>
      <input
        id="location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Álbum, cajón, cápsula…"
      />

      <label htmlFor="notes">Notas</label>
      <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

      <button type="submit" disabled={isSaving}>
        {isSaving ? 'Guardando…' : 'Guardar moneda'}
      </button>
    </form>
  )
}

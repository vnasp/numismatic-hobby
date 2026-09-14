import { useState, type FormEvent } from 'react'

interface Props {
  onSearch: (km: string) => void
  isSearching: boolean
}

export function KmSearchForm({ onSearch, isSearching }: Props) {
  const [km, setKm] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = km.trim()
    if (!trimmed) return
    onSearch(trimmed)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="km">Número KM</label>
      <input
        id="km"
        type="text"
        inputMode="decimal"
        value={km}
        onChange={(e) => setKm(e.target.value)}
        placeholder="Por ejemplo: 360.1"
      />
      <button type="submit" disabled={isSearching}>
        {isSearching ? 'Buscando…' : 'Buscar'}
      </button>
    </form>
  )
}

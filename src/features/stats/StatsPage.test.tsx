import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StatsPage } from './StatsPage'
import type { CollectionEntry } from '../collection/useCollection'

let entries: CollectionEntry[] = []

vi.mock('../collection/useCollection', () => ({
  useCollection: () => ({ data: entries, isLoading: false, error: null }),
}))

vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } }, loading: false, signOut: vi.fn() }),
}))

function entry(overrides: Partial<CollectionEntry> = {}): CollectionEntry {
  return {
    id: crypto.randomUUID(),
    numistaId: 420,
    numistaIssueId: null,
    grade: 'vf',
    title: '1 Peso',
    issuerCode: 'chili',
    issuerName: 'Chile',
    continent: 'América',
    reference: null,
    issueYear: 1955,
    mintLetter: null,
    thumbnail: null,
    thumbnailBack: null,
    material: null,
    diameterMm: null,
    weightG: null,
    value: null,
    isFavorite: false,
    ...overrides,
  }
}

function renderStats() {
  return render(
    <MemoryRouter>
      <StatsPage />
    </MemoryRouter>,
  )
}

test('suma el valor de la colección y cuenta las que faltan por valorar', () => {
  entries = [
    entry({ value: { amount: 3500, currency: 'CLP', source: null, at: null } }),
    entry({ value: { amount: 1200, currency: 'CLP', source: null, at: null } }),
    entry({ value: null }),
  ]
  renderStats()

  // El español no agrupa los millares de cuatro dígitos: 4700, no 4.700.
  expect(screen.getByText('4700 CLP')).toBeInTheDocument()
  expect(screen.getByText('2 monedas valoradas')).toBeInTheDocument()
  expect(screen.getByText('Sin valorar')).toBeInTheDocument()
})

test('muestra cada divisa por separado, sin inventar un tipo de cambio', () => {
  entries = [
    entry({ value: { amount: 3500, currency: 'CLP', source: null, at: null } }),
    entry({ value: { amount: 8, currency: 'EUR', source: null, at: null } }),
  ]
  renderStats()

  expect(screen.getByText(/CLP/)).toBeInTheDocument()
  expect(screen.getByText(/EUR/)).toBeInTheDocument()
})

test('sin ninguna valoración no muestra la sección', () => {
  entries = [entry({ value: null })]
  renderStats()

  expect(screen.queryByRole('heading', { name: 'Valoración' })).not.toBeInTheDocument()
})

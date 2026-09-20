import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { PublicCollectionPage } from './PublicCollectionPage'
import type { CollectionEntry } from '../collection/useCollection'
import { elegirEnDesplegable } from '../../testing/dropdown'

let entries: CollectionEntry[] = []

vi.mock('./usePublicCollection', () => ({
  usePublicCollection: () => ({ data: entries, isLoading: false, error: null }),
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
    reference: { code: 'KM', number: '179a' },
    issueYear: 1955,
    gregorianYear: 1955,
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

function renderPublic() {
  return render(
    <MemoryRouter>
      <PublicCollectionPage />
    </MemoryRouter>,
  )
}

test('muestra la colección sin pedir sesión', () => {
  entries = [entry({ title: '1 Peso' }), entry({ title: '10 Pesos' })]
  renderPublic()

  expect(screen.getByText('1 Peso')).toBeInTheDocument()
  expect(screen.getByText('10 Pesos')).toBeInTheDocument()
  expect(screen.getByText(/2 monedas/)).toBeInTheDocument()
})

test('no ofrece nada de editar: es una vitrina, no la colección propia', () => {
  entries = [entry()]
  renderPublic()

  expect(screen.queryByRole('button', { name: /favorita/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /ver la ficha/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /agregar moneda/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /tu cuenta/i })).not.toBeInTheDocument()
})

test('se puede buscar y filtrar por país', async () => {
  const user = userEvent.setup()
  entries = [
    entry({ title: '1 Peso', issuerName: 'Chile' }),
    entry({ title: '1 Euro', issuerName: 'España', continent: 'Europa' }),
  ]
  renderPublic()

  await elegirEnDesplegable(user, /filtrar por país/i, /^España/)

  expect(screen.getByText('1 Euro')).toBeInTheDocument()
  expect(screen.queryByText('1 Peso')).not.toBeInTheDocument()
})

test('ordena por continente, país y catálogo', () => {
  entries = [
    entry({ title: '1 Euro', issuerName: 'España', continent: 'Europa' }),
    entry({ title: '10 Pesos', issuerName: 'Chile', reference: { code: 'KM', number: '216' } }),
    entry({ title: '1 Peso', issuerName: 'Chile', reference: { code: 'KM', number: '179a' } }),
  ]
  renderPublic()

  const titulos = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
  expect(titulos).toEqual(['1 Peso', '10 Pesos', '1 Euro'])
})

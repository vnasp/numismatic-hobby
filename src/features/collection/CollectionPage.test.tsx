import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CollectionPage } from './CollectionPage'
import { elegirEnDesplegable, valorDeDesplegable } from '../../testing/dropdown'
import type { CollectionEntry } from './useCollection'

const signOut = vi.fn()
const toggleFavorite = vi.fn()

vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } }, loading: false, signOut }),
}))

let entries: CollectionEntry[] = []

vi.mock('./useCollection', () => ({
  useCollection: () => ({ data: entries, isLoading: false, error: null }),
}))

vi.mock('./useToggleFavorite', () => ({
  useToggleFavorite: () => ({ mutate: toggleFavorite, error: null }),
}))

const deleteItem = vi.fn()

vi.mock('./useDeleteItem', () => ({
  useDeleteItem: () => ({ mutate: deleteItem, error: null, isPending: false }),
}))

function entry(overrides: Partial<CollectionEntry> = {}): CollectionEntry {
  return {
    id: crypto.randomUUID(),
    numistaId: 420,
    numistaIssueId: 900,
    grade: 'vg',
    title: '1 Peso',
    issuerCode: 'chile',
    issuerName: 'Chile',
    continent: 'América',
    reference: { code: 'KM', number: '179a' },
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

function renderPage() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CollectionPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  signOut.mockReset()
  toggleFavorite.mockReset()
  deleteItem.mockReset()
  entries = []
})

test('permite cerrar sesión desde el menú de cuenta', async () => {
  const user = userEvent.setup()
  renderPage()

  // La acción está detrás del botón de cuenta: no debe verse hasta abrirlo.
  expect(screen.queryByRole('menuitem', { name: /cerrar sesión/i })).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /tu cuenta/i }))
  await user.click(screen.getByRole('menuitem', { name: /cerrar sesión/i }))

  expect(signOut).toHaveBeenCalled()
})

test('resume la colección en monedas y países', () => {
  entries = [
    entry({ issuerName: 'Chile' }),
    entry({ issuerName: 'Chile' }),
    entry({ issuerName: 'Malvinas, Islas' }),
  ]
  renderPage()

  expect(screen.getByText(/3 monedas · 2 países/)).toBeInTheDocument()
})

test('usa el singular cuando hay una sola moneda de un solo país', () => {
  entries = [entry()]
  renderPage()

  expect(screen.getByText(/1 moneda · 1 país/)).toBeInTheDocument()
})

test('filtra la colección con el buscador', async () => {
  const user = userEvent.setup()
  entries = [entry({ title: '1 Peso' }), entry({ title: '2 Pence' })]
  renderPage()

  await user.type(screen.getByLabelText(/buscar en mi colección/i), 'pence')

  expect(screen.getByText('2 Pence')).toBeInTheDocument()
  expect(screen.queryByText('1 Peso')).not.toBeInTheDocument()
})

test('avisa cuando el filtro no deja ninguna moneda a la vista', async () => {
  const user = userEvent.setup()
  entries = [entry({ title: '1 Peso' })]
  renderPage()

  await user.type(screen.getByLabelText(/buscar en mi colección/i), 'zzz')

  expect(screen.getByText(/ninguna moneda coincide/i)).toBeInTheDocument()
})

test('filtra por país desde el desplegable', async () => {
  const user = userEvent.setup()
  entries = [
    entry({ title: '1 Peso', issuerName: 'Chile' }),
    entry({ title: '2 Pence', issuerName: 'Malvinas, Islas' }),
  ]
  renderPage()

  // El nombre de la opción lleva el recuento: "Chile 1".
  await elegirEnDesplegable(user, /filtrar por país/i, /^Chile/)

  expect(screen.getByText('1 Peso')).toBeInTheDocument()
  expect(screen.queryByText('2 Pence')).not.toBeInTheDocument()
})

test('marca una moneda como favorita invirtiendo su estado actual', async () => {
  const user = userEvent.setup()
  const favorita = entry({ title: '1 Peso', isFavorite: false })
  entries = [favorita]
  renderPage()

  await user.click(screen.getByRole('button', { name: /marcar .* como favorita/i }))

  expect(toggleFavorite).toHaveBeenCalledWith({ id: favorita.id, isFavorite: true })
})

test('no muestra el buscador cuando la colección está vacía', () => {
  entries = []
  renderPage()

  expect(screen.queryByLabelText(/buscar en mi colección/i)).not.toBeInTheDocument()
  expect(screen.getByText(/tu vitrina está vacía/i)).toBeInTheDocument()
})

test('filtra por continente y acota los países del selector', async () => {
  const user = userEvent.setup()
  entries = [
    entry({ title: '1 Peso', issuerName: 'Chile', continent: 'América' }),
    entry({ title: '1 Euro', issuerName: 'España', continent: 'Europa' }),
  ]
  renderPage()

  await user.click(screen.getByRole('button', { name: /europa/i }))

  expect(screen.getByRole('button', { name: /europa/i })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.queryByText('1 Peso')).not.toBeInTheDocument()
  expect(screen.getByText('1 Euro')).toBeInTheDocument()
  await user.click(screen.getByRole('combobox', { name: 'Filtrar por país' }))
  expect(screen.queryByRole('option', { name: /chile/i })).not.toBeInTheDocument()
  expect(screen.getByRole('option', { name: /españa/i })).toBeInTheDocument()
})

test('al cambiar de continente quita un país que no pertenece a él', async () => {
  const user = userEvent.setup()
  entries = [
    entry({ title: '1 Peso', issuerName: 'Chile', continent: 'América' }),
    entry({ title: '1 Euro', issuerName: 'España', continent: 'Europa' }),
  ]
  renderPage()

  await elegirEnDesplegable(user, 'Filtrar por país', /^Chile/)
  await user.click(screen.getByRole('button', { name: /europa/i }))

  expect(valorDeDesplegable('Filtrar por país')).toContain('Todas')
  expect(screen.getByText('1 Euro')).toBeInTheDocument()
})

test('no muestra los continentes si toda la colección es de uno solo', () => {
  entries = [entry({ continent: 'América' }), entry({ continent: 'América' })]
  renderPage()

  expect(screen.queryByRole('group', { name: /continente/i })).not.toBeInTheDocument()
})

test('ordena por continente, país y KM', async () => {
  const user = userEvent.setup()
  entries = [
    entry({ title: '1 Euro', issuerName: 'España', continent: 'Europa', reference: { code: 'KM', number: '1' } }),
    entry({ title: '10 Pesos', issuerName: 'Chile', continent: 'América', reference: { code: 'KM', number: '216' } }),
    entry({ title: '1 Peso', issuerName: 'Chile', continent: 'América', reference: { code: 'KM', number: '179a' } }),
  ]
  renderPage()

  await elegirEnDesplegable(user, 'Ordenar', /continente · país · km/i)

  const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
  expect(titles).toEqual(['1 Peso', '10 Pesos', '1 Euro'])
})

test('empieza en grilla y permite cambiar a lista', async () => {
  const user = userEvent.setup()
  entries = [entry({ title: '1 Peso' }), entry({ title: '2 Pence' })]
  renderPage()

  const grilla = screen.getByRole('button', { name: 'Ver en grilla' })
  const lista = screen.getByRole('button', { name: 'Ver en lista' })
  expect(grilla).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('list', { name: '' }).className).not.toContain('coin-grid--list')

  await user.click(lista)

  expect(lista).toHaveAttribute('aria-pressed', 'true')
  expect(grilla).toHaveAttribute('aria-pressed', 'false')
  expect(document.querySelector('.coin-grid--list')).toBeInTheDocument()
  // Las monedas siguen ahí: cambia la forma de verlas, no el filtro.
  expect(screen.getByText('1 Peso')).toBeInTheDocument()
  expect(screen.getByText('2 Pence')).toBeInTheDocument()
})

test('ordena poniendo las favoritas primero', async () => {
  const user = userEvent.setup()
  entries = [
    entry({ title: '1 Peso', isFavorite: false }),
    entry({ title: '2 Pence', isFavorite: true }),
  ]
  renderPage()

  await elegirEnDesplegable(user, 'Ordenar', /favoritas primero/i)

  const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
  expect(titles).toEqual(['2 Pence', '1 Peso'])
})

test('eliminar una moneda pide confirmación antes de borrarla', async () => {
  const user = userEvent.setup()
  const moneda = entry({ title: '1 Peso' })
  entries = [moneda]
  renderPage()

  await user.click(screen.getByRole('button', { name: /eliminar 1 Peso de mi colección/i }))

  const dialogo = screen.getByRole('dialog')
  expect(dialogo).toHaveTextContent('¿Eliminar 1 Peso?')
  // El foco arranca en Cancelar: un Enter por inercia no borra nada.
  expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  expect(deleteItem).not.toHaveBeenCalled()

  await user.click(screen.getByRole('button', { name: 'Eliminar' }))

  expect(deleteItem).toHaveBeenCalledWith(moneda.id)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('cancelar deja la moneda donde estaba', async () => {
  const user = userEvent.setup()
  entries = [entry({ title: '1 Peso' })]
  renderPage()

  await user.click(screen.getByRole('button', { name: /eliminar 1 Peso/i }))
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))

  expect(deleteItem).not.toHaveBeenCalled()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByText('1 Peso')).toBeInTheDocument()
})

test('Escape cierra la confirmación sin borrar', async () => {
  const user = userEvent.setup()
  entries = [entry({ title: '1 Peso' })]
  renderPage()

  await user.click(screen.getByRole('button', { name: /eliminar 1 Peso/i }))
  await user.keyboard('{Escape}')

  expect(deleteItem).not.toHaveBeenCalled()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('abre la ficha de la moneda desde la tarjeta', async () => {
  const user = userEvent.setup()
  entries = [
    entry({
      title: '1 Colón',
      thumbnail: 'https://ejemplo.cl/reverso.jpg',
      material: 'Acero inoxidable',
      diameterMm: 24.5,
    }),
  ]
  renderPage()

  await user.click(screen.getByRole('button', { name: /ver la ficha de 1 Colón/i }))

  const ficha = screen.getByRole('dialog')
  expect(ficha).toHaveTextContent('Acero inoxidable')
  expect(ficha).toHaveTextContent('24,5 mm')
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CoinDetail } from './CoinDetail'
import type { CollectionEntry } from './useCollection'
import { elegirEnDesplegable } from '../../testing/dropdown'

const saveItem = vi.fn()

vi.mock('./useSaveItem', () => ({
  useSaveItem: () => ({
    mutate: saveItem,
    error: null,
    isPending: false,
    isSuccess: false,
  }),
}))

const entry: CollectionEntry = {
  id: 'item-1',
  numistaId: 7666,
  numistaIssueId: null,
  grade: 'xf',
  title: '1 Colón',
  issuerCode: 'costa_rica',
  issuerName: 'Costa Rica',
  continent: 'América',
  reference: { code: 'KM', number: '186.2' },
  issueYear: 1968,
  gregorianYear: 1968,
  mintLetter: 'So',
  thumbnail: 'https://ejemplo.cl/reverso.jpg',
  thumbnailBack: 'https://ejemplo.cl/anverso.jpg',
  material: 'Acero inoxidable',
  diameterMm: 24.5,
  weightG: 5.2,
  value: null,
  isFavorite: false,
}

function renderDetail(overrides: Partial<CollectionEntry> = {}) {
  const onClose = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CoinDetail entry={{ ...entry, ...overrides }} onClose={onClose} />
    </QueryClientProvider>,
  )
  return { onClose }
}

beforeEach(() => {
  saveItem.mockReset()
})

test('muestra el material y el diámetro, que es lo que no cabe en la tarjeta', () => {
  renderDetail()

  expect(screen.getByText('Material')).toBeInTheDocument()
  expect(screen.getByText('Acero inoxidable')).toBeInTheDocument()
  expect(screen.getByText('24,5 mm')).toBeInTheDocument()
  expect(screen.getByText('5,2 g')).toBeInTheDocument()
})

test('muestra la ceca aparte del año, porque el precio depende de las dos', () => {
  renderDetail()

  expect(screen.getByText('Ceca')).toBeInTheDocument()
  expect(screen.getByText('So')).toBeInTheDocument()
})

test('omite la ceca cuando el ejemplar se guardó sin emisión determinada', () => {
  renderDetail({ mintLetter: null })

  expect(screen.queryByText('Ceca')).not.toBeInTheDocument()
})

test('omite los datos que Numista no trae', () => {
  renderDetail({ material: null, diameterMm: null, weightG: null })

  expect(screen.queryByText('Material')).not.toBeInTheDocument()
  expect(screen.queryByText('Diámetro')).not.toBeInTheDocument()
})

test('enlaza a la ficha de Numista de esa moneda', () => {
  renderDetail()

  expect(screen.getByRole('link', { name: /ver en numista/i })).toHaveAttribute(
    'href',
    'https://es.numista.com/7666',
  )
})

test('guarda la valoración con su moneda', async () => {
  const user = userEvent.setup()
  renderDetail()

  await user.type(screen.getByLabelText(/valor estimado/i), '3500')
  await elegirEnDesplegable(user, /moneda/i, 'CLP')
  await user.click(screen.getByRole('button', { name: 'Guardar' }))

  expect(saveItem).toHaveBeenCalledWith({
    id: 'item-1',
    grade: 'xf',
    amount: 3500,
    currency: 'CLP',
  })
})

test('acepta la coma como separador decimal', async () => {
  const user = userEvent.setup()
  renderDetail()

  await user.type(screen.getByLabelText(/valor estimado/i), '12,5')
  await user.click(screen.getByRole('button', { name: 'Guardar' }))

  expect(saveItem).toHaveBeenCalledWith({
    id: 'item-1',
    grade: 'xf',
    amount: 12.5,
    currency: 'CLP',
  })
})

test('vaciar el campo borra la valoración anotada', async () => {
  const user = userEvent.setup()
  renderDetail({
    value: { amount: 3500, currency: 'CLP', source: 'Numista, XF', at: '2026-09-01T12:00:00Z' },
  })

  expect(screen.getByText(/anotada el 1 de septiembre de 2026/i)).toHaveTextContent(
    'Numista, XF',
  )

  await user.clear(screen.getByLabelText(/valor estimado/i))
  await user.click(screen.getByRole('button', { name: 'Guardar' }))

  expect(saveItem).toHaveBeenCalledWith({
    id: 'item-1',
    grade: 'xf',
    amount: null,
    currency: 'CLP',
  })
})

test('no guarda un valor que no es un número', async () => {
  const user = userEvent.setup()
  renderDetail()

  await user.type(screen.getByLabelText(/valor estimado/i), 'como diez lucas')
  await user.click(screen.getByRole('button', { name: 'Guardar' }))

  expect(saveItem).not.toHaveBeenCalled()
})

test('se cierra con Escape', async () => {
  const user = userEvent.setup()
  const { onClose } = renderDetail()

  await user.keyboard('{Escape}')

  expect(onClose).toHaveBeenCalled()
})

test('corrige el estado de conservación de una moneda que quedó sin él', async () => {
  const user = userEvent.setup()
  renderDetail({ grade: null })

  await elegirEnDesplegable(user, /estado de conservación/i, /^VF/)
  await user.click(screen.getByRole('button', { name: 'Guardar' }))

  expect(saveItem).toHaveBeenCalledWith({
    id: 'item-1',
    grade: 'vf',
    amount: null,
    currency: 'CLP',
  })
})

test('muestra el año gregoriano cuando la moneda usa otro calendario', () => {
  renderDetail({ issueYear: 5745, gregorianYear: 1985 })

  expect(screen.getByText('5745')).toBeInTheDocument()
  expect(screen.getByText('Año gregoriano')).toBeInTheDocument()
  expect(screen.getByText('1985')).toBeInTheDocument()
})

test('no repite el año cuando ya es gregoriano', () => {
  renderDetail({ issueYear: 1968, gregorianYear: 1968 })

  expect(screen.queryByText('Año gregoriano')).not.toBeInTheDocument()
})

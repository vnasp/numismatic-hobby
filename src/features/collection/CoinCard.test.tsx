import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CoinCard } from './CoinCard'
import type { CollectionEntry } from './useCollection'

const entry: CollectionEntry = {
  id: 'abc',
  numistaId: 420,
  numistaIssueId: 900,
  grade: 'xf',
  title: '5 Cents - Victoria',
  issuerCode: 'canada',
  issuerName: 'Canadá',
  continent: null,
  reference: { code: 'KM', number: '2' },
  issueYear: 1870,
  gregorianYear: 1870,
  mintLetter: null,
  thumbnail: 'https://ejemplo.cl/reverso.jpg',
  thumbnailBack: 'https://ejemplo.cl/anverso.jpg',
  material: null,
  diameterMm: null,
  weightG: null,
  value: null,
  isFavorite: false,
}

test('muestra el título, y el país y año en una sola línea', () => {
  render(<CoinCard entry={entry} />)
  expect(screen.getByText('5 Cents - Victoria')).toBeInTheDocument()
  expect(screen.getByText('Canadá · 1870')).toBeInTheDocument()
  expect(screen.getByText(/KM #2/)).toBeInTheDocument()
})

test('omite el separador cuando falta el año', () => {
  render(<CoinCard entry={{ ...entry, issueYear: null }} />)
  expect(screen.getByText('Canadá')).toBeInTheDocument()
})

test('omite el separador cuando falta el país', () => {
  render(<CoinCard entry={{ ...entry, issuerName: null }} />)
  expect(screen.getByText('1870')).toBeInTheDocument()
})

test('muestra el grado con su etiqueta en español', () => {
  render(<CoinCard entry={entry} />)
  expect(screen.getByText(/extraordinariamente bien conservada/i)).toBeInTheDocument()
})

test('no rompe cuando faltan la foto y el grado', () => {
  render(<CoinCard entry={{ ...entry, thumbnail: null, grade: null, issueYear: null }} />)
  expect(screen.getByText('5 Cents - Victoria')).toBeInTheDocument()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
})

test('carga la miniatura de forma diferida (loading="lazy")', () => {
  // Una <img alt=""> es decorativa y no expone el rol "img" en el árbol de
  // accesibilidad, así que se busca por selector en vez de por rol.
  const { container } = render(<CoinCard entry={entry} />)
  expect(container.querySelector('img')).toHaveAttribute('loading', 'lazy')
})

test('oculta la imagen si la URL de la miniatura falla en vez de dejar un ícono roto', () => {
  const { container } = render(<CoinCard entry={entry} />)
  const img = container.querySelector('img')
  expect(img).not.toBeNull()

  fireEvent.error(img!)

  expect(container.querySelector('img')).not.toBeInTheDocument()
  expect(screen.getByText('5 Cents - Victoria')).toBeInTheDocument()
})

test('avisa al marcar la moneda como favorita', async () => {
  const user = userEvent.setup()
  const onToggleFavorite = vi.fn()
  render(<CoinCard entry={entry} onToggleFavorite={onToggleFavorite} />)

  const fav = screen.getByRole('button', { name: /marcar .* como favorita/i })
  expect(fav).toHaveAttribute('aria-pressed', 'false')

  await user.click(fav)

  expect(onToggleFavorite).toHaveBeenCalledWith(entry)
})

test('el corazón queda presionado y ofrece quitarla cuando ya es favorita', () => {
  render(<CoinCard entry={{ ...entry, isFavorite: true }} onToggleFavorite={vi.fn()} />)

  const fav = screen.getByRole('button', { name: /quitar .* de favoritas/i })
  expect(fav).toHaveAttribute('aria-pressed', 'true')
})

test('sin acciones no hay corazón ni papelera: sólo dar vuelta la moneda', () => {
  render(<CoinCard entry={entry} />)

  expect(screen.queryByRole('button', { name: /favorita/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument()
  // Darla vuelta sí se puede: es mirar, no editar.
  expect(screen.getByRole('button', { name: /ver la otra cara/i })).toBeInTheDocument()
})

test('carga las dos caras cuando Numista tiene ambas fotos', () => {
  const { container } = render(<CoinCard entry={entry} />)

  const caras = [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'))
  expect(caras).toEqual(['https://ejemplo.cl/reverso.jpg', 'https://ejemplo.cl/anverso.jpg'])
  // La de atrás sólo se hace visible con CSS, al pasar el puntero.
  expect(container.querySelector('.coin-card__img--back')).toBeInTheDocument()
})

test('sin foto de la otra cara muestra una sola imagen', () => {
  const { container } = render(<CoinCard entry={{ ...entry, thumbnailBack: null }} />)

  expect(container.querySelectorAll('img')).toHaveLength(1)
  expect(container.querySelector('.coin-card__img--back')).not.toBeInTheDocument()
})

test('tocar la moneda la da vuelta', async () => {
  const user = userEvent.setup()
  const { container } = render(<CoinCard entry={entry} />)

  const disco = container.querySelector('.coin-card__disc')!
  expect(disco).not.toHaveClass('coin-card__disc--flipped')

  const moneda = screen.getByRole('button', { name: /ver la otra cara de/i })
  await user.click(moneda)
  expect(disco).toHaveClass('coin-card__disc--flipped')

  await user.click(moneda)
  expect(disco).not.toHaveClass('coin-card__disc--flipped')
})

test('sin segunda foto la moneda no es un botón que no hace nada', () => {
  render(<CoinCard entry={{ ...entry, thumbnailBack: null }} />)

  expect(screen.queryByRole('button', { name: /ver la otra cara/i })).not.toBeInTheDocument()
})

test('la ficha se abre desde el título, que es el otro clic disponible', async () => {
  const user = userEvent.setup()
  const onOpen = vi.fn()
  render(<CoinCard entry={entry} onOpen={onOpen} />)

  await user.click(screen.getByRole('button', { name: '5 Cents - Victoria' }))

  expect(onOpen).toHaveBeenCalledWith(entry)
})

test('sin acción de abrir, el título es sólo texto', () => {
  render(<CoinCard entry={entry} />)

  expect(screen.queryByRole('button', { name: '5 Cents - Victoria' })).not.toBeInTheDocument()
  expect(screen.getByText('5 Cents - Victoria')).toBeInTheDocument()
})

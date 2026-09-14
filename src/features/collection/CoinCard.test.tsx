import { render, screen, fireEvent } from '@testing-library/react'
import { CoinCard } from './CoinCard'

const entry = {
  id: 'abc',
  grade: 'xf' as const,
  title: '5 Cents - Victoria',
  issuerName: 'Canadá',
  kmNumber: '2',
  issueYear: 1870,
  thumbnail: 'https://ejemplo.cl/moneda.jpg',
}

test('muestra el título, país, año y KM de la moneda', () => {
  render(<CoinCard entry={entry} />)
  expect(screen.getByText('5 Cents - Victoria')).toBeInTheDocument()
  expect(screen.getByText('Canadá')).toBeInTheDocument()
  expect(screen.getByText('1870')).toBeInTheDocument()
  expect(screen.getByText(/KM #2/)).toBeInTheDocument()
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

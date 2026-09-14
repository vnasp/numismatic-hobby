import { render, screen } from '@testing-library/react'
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

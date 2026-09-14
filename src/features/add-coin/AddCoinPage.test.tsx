import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AddCoinPage } from './AddCoinPage'

const searchByKm = vi.fn()
const getTypeWithIssues = vi.fn()

vi.mock('../../lib/numista/proxyClient', () => ({
  searchByKm: (...args: unknown[]) => searchByKm(...args),
  getTypeWithIssues: (...args: unknown[]) => getTypeWithIssues(...args),
}))

const saveItem = vi.fn()

vi.mock('./saveItem', () => ({
  saveItem: (...args: unknown[]) => saveItem(...args),
}))

beforeEach(() => {
  searchByKm.mockReset()
  getTypeWithIssues.mockReset()
  saveItem.mockReset()
})

function renderPage() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AddCoinPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

test('no arrastra el error de un guardado fallido a una búsqueda nueva', async () => {
  const user = userEvent.setup()

  searchByKm.mockResolvedValueOnce({
    count: 1,
    types: [{ id: 1, title: 'Moneda A', min_year: 2000, obverse_thumbnail: 'https://ejemplo.cl/a.jpg' }],
  })
  getTypeWithIssues.mockResolvedValueOnce({
    type: { id: 1, title: 'Moneda A' },
    issues: [],
  })
  saveItem.mockRejectedValueOnce(new Error('Fallo simulado al guardar'))

  renderPage()

  await user.type(screen.getByLabelText(/número km/i), '111')
  await user.click(screen.getByRole('button', { name: /^buscar$/i }))

  const typeButton = await screen.findByRole('button', { name: /Moneda A/i })
  await user.click(typeButton)

  await user.click(await screen.findByRole('button', { name: /guardar moneda/i }))

  expect(await screen.findByRole('alert')).toHaveTextContent(/fallo simulado al guardar/i)

  // Abandona la moneda fallida y vuelve a la búsqueda.
  await user.click(screen.getByRole('button', { name: /elegir otra moneda/i }))

  searchByKm.mockResolvedValueOnce({
    count: 1,
    types: [{ id: 2, title: 'Moneda B', min_year: 2001, obverse_thumbnail: 'https://ejemplo.cl/b.jpg' }],
  })
  await user.type(screen.getByLabelText(/número km/i), '222')
  await user.click(screen.getByRole('button', { name: /^buscar$/i }))

  await screen.findByRole('button', { name: /Moneda B/i })

  // El error del guardado anterior ya no debe mostrarse: pertenece a una
  // moneda que la usuaria abandonó, no a esta búsqueda nueva.
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('no arrastra el error de una carga de tipo fallida a una búsqueda nueva', async () => {
  const user = userEvent.setup()

  searchByKm.mockResolvedValueOnce({
    count: 1,
    types: [{ id: 1, title: 'Moneda A', min_year: 2000, obverse_thumbnail: 'https://ejemplo.cl/a.jpg' }],
  })
  getTypeWithIssues.mockRejectedValueOnce(new Error('Fallo simulado al cargar el tipo'))

  renderPage()

  await user.type(screen.getByLabelText(/número km/i), '111')
  await user.click(screen.getByRole('button', { name: /^buscar$/i }))

  const typeButton = await screen.findByRole('button', { name: /Moneda A/i })
  await user.click(typeButton)

  expect(await screen.findByRole('alert')).toHaveTextContent(/fallo simulado al cargar el tipo/i)

  // Sin pasar por "Elegir otra moneda": se busca directamente de nuevo.
  searchByKm.mockResolvedValueOnce({
    count: 1,
    types: [{ id: 2, title: 'Moneda B', min_year: 2001, obverse_thumbnail: 'https://ejemplo.cl/b.jpg' }],
  })
  await user.clear(screen.getByLabelText(/número km/i))
  await user.type(screen.getByLabelText(/número km/i), '222')
  await user.click(screen.getByRole('button', { name: /^buscar$/i }))

  await screen.findByRole('button', { name: /Moneda B/i })

  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

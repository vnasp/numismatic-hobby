import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CollectionPage } from './CollectionPage'

const signOut = vi.fn()

vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } }, loading: false, signOut }),
}))

vi.mock('./useCollection', () => ({
  useCollection: () => ({ data: [], isLoading: false, error: null }),
}))

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
})

test('permite cerrar sesión desde el encabezado de la colección', async () => {
  const user = userEvent.setup()
  renderPage()

  await user.click(screen.getByRole('button', { name: /cerrar sesión/i }))

  expect(signOut).toHaveBeenCalled()
})

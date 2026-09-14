import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KmSearchForm } from './KmSearchForm'

test('entrega el KM buscado sin espacios sobrantes', async () => {
  const onSearch = vi.fn()
  const user = userEvent.setup()
  render(<KmSearchForm onSearch={onSearch} isSearching={false} />)

  await user.type(screen.getByLabelText(/número km/i), '  360.1 ')
  await user.click(screen.getByRole('button', { name: /buscar/i }))

  expect(onSearch).toHaveBeenCalledWith('360.1')
})

test('no busca con el campo vacío', async () => {
  const onSearch = vi.fn()
  const user = userEvent.setup()
  render(<KmSearchForm onSearch={onSearch} isSearching={false} />)

  await user.click(screen.getByRole('button', { name: /buscar/i }))

  expect(onSearch).not.toHaveBeenCalled()
})

test('deshabilita el botón mientras busca', () => {
  render(<KmSearchForm onSearch={vi.fn()} isSearching={true} />)
  expect(screen.getByRole('button', { name: /buscando/i })).toBeDisabled()
})

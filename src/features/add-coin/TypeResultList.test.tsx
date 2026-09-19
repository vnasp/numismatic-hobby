import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TypeResultList } from './TypeResultList'
import type { NumistaSearchResultType } from '../../../shared/numista/types'

// Forma real de un item de `GET /types` (búsqueda): ver swagger.yaml, esquema
// del 200 de `/types`. Las miniaturas vienen en campos planos y NO hay
// `references` (eso solo existe en `GET /types/{id}`).
const searchResult: NumistaSearchResultType = {
  id: 420,
  title: '5 Cents - Victoria',
  issuer: { code: 'canada', name: 'Canada' },
  min_year: 1858,
  max_year: 1901,
  obverse_thumbnail: 'https://en.numista.com/catalogue/photos/canada/1009-180.jpg',
  reverse_thumbnail: 'https://en.numista.com/catalogue/photos/canada/1010-180.jpg',
  category: 'coin',
}

test('muestra el reverso de la moneda usando el campo plano reverse_thumbnail', () => {
  // Una <img alt=""> es decorativa y no expone el rol "img", así que se
  // busca por selector en vez de por rol.
  const { container } = render(<TypeResultList types={[searchResult]} onSelect={vi.fn()} />)

  const img = container.querySelector('img')
  expect(img).toHaveAttribute('src', searchResult.reverse_thumbnail)
})

test('cae al anverso cuando el resultado no trae foto del reverso', () => {
  const { container } = render(
    <TypeResultList
      types={[{ ...searchResult, reverse_thumbnail: undefined }]}
      onSelect={vi.fn()}
    />,
  )

  expect(container.querySelector('img')).toHaveAttribute(
    'src',
    searchResult.obverse_thumbnail,
  )
})

test('enlaza a la ficha de la moneda en Numista para poder revisarla', () => {
  render(<TypeResultList types={[searchResult]} onSelect={vi.fn()} />)

  const link = screen.getByRole('link', { name: /ver 5 Cents - Victoria en numista/i })
  expect(link).toHaveAttribute('href', 'https://es.numista.com/420')
  expect(link).toHaveAttribute('target', '_blank')
  expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
})

test('no muestra una insignia de KM en los resultados de búsqueda', () => {
  render(<TypeResultList types={[searchResult]} onSelect={vi.fn()} />)

  expect(screen.queryByText(/KM #/)).not.toBeInTheDocument()
})

test('no rompe cuando el resultado no trae miniatura', () => {
  render(
    <TypeResultList
      types={[{ id: 1, title: 'Sin foto' }]}
      onSelect={vi.fn()}
    />,
  )

  expect(screen.getByText('Sin foto')).toBeInTheDocument()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
})

test('llama a onSelect con el item elegido', async () => {
  const user = userEvent.setup()
  const onSelect = vi.fn()
  render(<TypeResultList types={[searchResult]} onSelect={onSelect} />)

  await user.click(screen.getByRole('button', { name: /5 Cents - Victoria/i }))

  expect(onSelect).toHaveBeenCalledWith(searchResult)
})

test('muestra un mensaje cuando no hay resultados', () => {
  render(<TypeResultList types={[]} onSelect={vi.fn()} />)
  expect(screen.getByText(/no se encontraron monedas/i)).toBeInTheDocument()
})

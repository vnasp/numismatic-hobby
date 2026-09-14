import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemForm } from './ItemForm'

test('ofrece los siete grados de la escala', () => {
  render(<ItemForm onSubmit={vi.fn()} isSaving={false} />)
  const select = screen.getByLabelText(/estado/i)
  // siete grados más la opción "sin especificar"
  expect(select.querySelectorAll('option')).toHaveLength(8)
})

test('entrega los datos propios al guardar', async () => {
  const onSubmit = vi.fn()
  const user = userEvent.setup()
  render(<ItemForm onSubmit={onSubmit} isSaving={false} />)

  await user.selectOptions(screen.getByLabelText(/estado/i), 'xf')
  await user.type(screen.getByLabelText(/ubicación/i), 'Álbum 2, página 5')
  await user.type(screen.getByLabelText(/notas/i), 'Regalo de mi abuelo')
  await user.click(screen.getByRole('button', { name: /guardar/i }))

  expect(onSubmit).toHaveBeenCalledWith({
    grade: 'xf',
    conditionNotes: '',
    location: 'Álbum 2, página 5',
    notes: 'Regalo de mi abuelo',
  })
})

test('permite guardar sin especificar el grado', async () => {
  const onSubmit = vi.fn()
  const user = userEvent.setup()
  render(<ItemForm onSubmit={onSubmit} isSaving={false} />)

  await user.click(screen.getByRole('button', { name: /guardar/i }))

  expect(onSubmit).toHaveBeenCalledWith({
    grade: null,
    conditionNotes: '',
    location: '',
    notes: '',
  })
})

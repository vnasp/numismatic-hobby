import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemForm } from './ItemForm'
import { abrirDesplegable, elegirEnDesplegable, valorDeDesplegable } from '../../testing/dropdown'

test('ofrece los siete grados de la escala', async () => {
  const user = userEvent.setup()
  render(<ItemForm onSubmit={vi.fn()} isSaving={false} />)

  // siete grados más la opción "sin especificar"
  expect(await abrirDesplegable(user, /estado/i)).toHaveLength(8)
})

test('entrega los datos propios al enviar', async () => {
  const onSubmit = vi.fn()
  const user = userEvent.setup()
  render(<ItemForm onSubmit={onSubmit} isSaving={false} />)

  await elegirEnDesplegable(user, /estado/i, /^XF/)
  await user.type(screen.getByLabelText(/ubicación/i), 'Álbum 2, página 5')
  await user.type(screen.getByLabelText(/notas/i), 'Regalo de mi abuelo')
  await user.click(screen.getByRole('button', { name: /guardar moneda/i }))

  expect(onSubmit).toHaveBeenCalledWith({
    grade: 'xf',
    conditionNotes: '',
    location: 'Álbum 2, página 5',
    notes: 'Regalo de mi abuelo',
  })
})

test('permite enviar sin especificar el grado', async () => {
  const onSubmit = vi.fn()
  const user = userEvent.setup()
  render(<ItemForm onSubmit={onSubmit} isSaving={false} />)

  await user.click(screen.getByRole('button', { name: /guardar moneda/i }))

  expect(onSubmit).toHaveBeenCalledWith({
    grade: null,
    conditionNotes: '',
    location: '',
    notes: '',
  })
})

test('arranca con los valores recibidos, para no perder lo escrito al volver atrás', () => {
  render(
    <ItemForm
      onSubmit={vi.fn()}
      isSaving={false}
      initialValues={{
        grade: 'vf',
        conditionNotes: 'Golpe en el canto',
        location: 'Álbum 1',
        notes: 'De mi abuela',
      }}
    />,
  )

  expect(valorDeDesplegable(/estado/i)).toMatch(/^VF/)
  expect(screen.getByLabelText(/observaciones/i)).toHaveValue('Golpe en el canto')
  expect(screen.getByLabelText(/ubicación/i)).toHaveValue('Álbum 1')
  expect(screen.getByLabelText(/notas/i)).toHaveValue('De mi abuela')
})

test('el texto del botón se puede cambiar para un flujo por pasos', () => {
  render(<ItemForm onSubmit={vi.fn()} isSaving={false} submitLabel="Continuar" />)
  expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument()
})

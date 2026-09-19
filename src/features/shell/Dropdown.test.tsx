import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dropdown } from './Dropdown'

const OPCIONES = [
  { value: 'am', label: 'América' },
  { value: 'eu', label: 'Europa' },
  { value: 'as', label: 'Asia' },
]

function renderDropdown(props: Partial<Parameters<typeof Dropdown>[0]> = {}) {
  const onChange = vi.fn()
  render(
    <Dropdown
      options={OPCIONES}
      value="am"
      onChange={onChange}
      ariaLabel="Continente"
      {...props}
    />,
  )
  return { onChange }
}

test('muestra la opción elegida y abre la lista al pulsarlo', async () => {
  const user = userEvent.setup()
  renderDropdown()

  const disparador = screen.getByRole('combobox', { name: 'Continente' })
  expect(disparador).toHaveTextContent('América')
  expect(disparador).toHaveAttribute('aria-expanded', 'false')

  await user.click(disparador)

  expect(disparador).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getAllByRole('option')).toHaveLength(3)
  expect(screen.getByRole('option', { name: 'América' })).toHaveAttribute('aria-selected', 'true')
})

test('elegir una opción la entrega y cierra la lista', async () => {
  const user = userEvent.setup()
  const { onChange } = renderDropdown()

  await user.click(screen.getByRole('combobox', { name: 'Continente' }))
  await user.click(screen.getByRole('option', { name: 'Europa' }))

  expect(onChange).toHaveBeenCalledWith('eu')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
})

test('se recorre con las flechas y se elige con Enter, sin sacar el foco', async () => {
  const user = userEvent.setup()
  const { onChange } = renderDropdown()

  const disparador = screen.getByRole('combobox', { name: 'Continente' })
  disparador.focus()
  await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')

  expect(onChange).toHaveBeenCalledWith('eu')
  expect(disparador).toHaveFocus()
})

test('Fin salta a la última opción y Escape cierra sin elegir', async () => {
  const user = userEvent.setup()
  const { onChange } = renderDropdown()

  const disparador = screen.getByRole('combobox', { name: 'Continente' })
  disparador.focus()
  await user.keyboard('{ArrowDown}{End}')
  expect(screen.getByRole('option', { name: 'Asia' })).toHaveClass('dropdown__option--active')

  await user.keyboard('{Escape}')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  expect(onChange).not.toHaveBeenCalled()
})

test('un clic fuera cierra la lista', async () => {
  const user = userEvent.setup()
  renderDropdown()

  await user.click(screen.getByRole('combobox', { name: 'Continente' }))
  await user.click(document.body)

  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
})

test('muestra el texto de reserva cuando el valor no está entre las opciones', () => {
  renderDropdown({ value: 'xx', placeholder: 'Selecciona' })

  expect(screen.getByRole('combobox', { name: 'Continente' })).toHaveTextContent('Selecciona')
})

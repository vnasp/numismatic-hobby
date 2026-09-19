import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

/**
 * Elige una opción en un `<Dropdown>`: abre el desplegable por su nombre
 * accesible y hace clic en la opción. Los desplegables propios no son
 * `<select>`, así que `userEvent.selectOptions` no les sirve.
 */
export async function elegirEnDesplegable(
  user: UserEvent,
  nombre: string | RegExp,
  opcion: string | RegExp,
) {
  await user.click(screen.getByRole('combobox', { name: nombre }))
  await user.click(screen.getByRole('option', { name: opcion }))
}

/** Abre un desplegable y devuelve sus opciones. */
export async function abrirDesplegable(user: UserEvent, nombre: string | RegExp) {
  await user.click(screen.getByRole('combobox', { name: nombre }))
  return within(screen.getByRole('listbox')).getAllByRole('option')
}

/** Lo que muestra el disparador de un desplegable. */
export function valorDeDesplegable(nombre: string | RegExp) {
  return screen.getByRole('combobox', { name: nombre }).textContent
}

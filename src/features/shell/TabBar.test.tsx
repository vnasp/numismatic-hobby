import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TabBar } from './TabBar'

function renderTabBar(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <TabBar />
    </MemoryRouter>,
  )
}

test('ofrece agregar una moneda desde el centro de la barra', () => {
  renderTabBar()

  expect(screen.getByRole('link', { name: /agregar moneda/i })).toHaveAttribute(
    'href',
    '/agregar',
  )
})

test('el botón de agregar va entre las dos primeras y las dos últimas secciones', () => {
  renderTabBar()

  const labels = screen
    .getAllByRole('link')
    .map((link) => link.getAttribute('aria-label') ?? link.textContent)

  expect(labels).toEqual([
    'Colección',
    'Países',
    'Agregar moneda',
    'Buscar',
    'Estadísticas',
  ])
})

test('marca como activa sólo la sección en que se está', () => {
  renderTabBar('/paises')

  expect(screen.getByRole('link', { name: 'Países' })).toHaveClass('tabbar__tab--active')
  expect(screen.getByRole('link', { name: 'Colección' })).not.toHaveClass('tabbar__tab--active')
})

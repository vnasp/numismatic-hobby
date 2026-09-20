import type { ComponentType } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { CoinsIcon, GlobeIcon, SearchIcon, ChartIcon, PlusIcon } from './icons'

export interface Tab {
  to: string
  label: string
  Icon: ComponentType<{ size?: number }>
}

/** Las cuatro secciones de la app con sesión. */
const PRIVATE_TABS: Tab[] = [
  { to: '/coleccion', label: 'Colección', Icon: CoinsIcon },
  { to: '/paises', label: 'Países', Icon: GlobeIcon },
  { to: '/buscar', label: 'Buscar', Icon: SearchIcon },
  { to: '/stats', label: 'Estadísticas', Icon: ChartIcon },
]

interface Props {
  tabs?: Tab[]
  /** El botón de agregar, que sólo tiene sentido con sesión. */
  add?: boolean
}

/**
 * La barra de pestañas fija al pie.
 *
 * La usan las dos mitades de la app: las cuatro secciones con sesión, con el
 * botón de agregar al medio, y las dos de la vitrina abierta, sin él. Es la
 * misma barra a propósito —el mismo alto, el mismo subrayado metálico en la
 * activa— porque es el mismo producto visto con y sin llave.
 */
export function TabBar({ tabs = PRIVATE_TABS, add = true }: Props) {
  const renderTab = (tab: Tab) => (
    <li key={tab.to}>
      <NavLink
        to={tab.to}
        end
        className={({ isActive }) => `tabbar__tab${isActive ? ' tabbar__tab--active' : ''}`}
      >
        <tab.Icon />
        <span className="tabbar__label">{tab.label}</span>
      </NavLink>
    </li>
  )

  // El botón de agregar va al medio, entre la segunda y la tercera pestaña.
  const middle = add ? Math.ceil(tabs.length / 2) : tabs.length

  return (
    <nav className="tabbar" aria-label="Secciones">
      {/* Con dos pestañas la barra completa las dejaría a media pantalla de
          distancia: se acota el ancho para que sigan siendo un par. */}
      <ul className={`tabbar__list${tabs.length < 3 ? ' tabbar__list--few' : ''}`}>
        {tabs.slice(0, middle).map(renderTab)}

        {add && (
          /* Se sale hacia arriba de la barra: por eso vive dentro de la lista
             (para ocupar su lugar en el reparto) pero se posiciona aparte. */
          <li className="tabbar__add-slot">
            <Link to="/agregar" className="tabbar__add" aria-label="Agregar moneda">
              <PlusIcon />
            </Link>
          </li>
        )}

        {tabs.slice(middle).map(renderTab)}
      </ul>
    </nav>
  )
}

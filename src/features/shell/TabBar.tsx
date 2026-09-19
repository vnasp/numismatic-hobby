import { NavLink, Link } from 'react-router-dom'
import { CoinsIcon, GlobeIcon, SearchIcon, ChartIcon, PlusIcon } from './icons'

const TABS = [
  { to: '/', label: 'Colección', Icon: CoinsIcon },
  { to: '/paises', label: 'Países', Icon: GlobeIcon },
  { to: '/buscar', label: 'Buscar', Icon: SearchIcon },
  { to: '/estadisticas', label: 'Estadísticas', Icon: ChartIcon },
]

/** El botón de agregar va al medio, entre la segunda y la tercera pestaña. */
const MIDDLE = TABS.length / 2

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Secciones">
      <ul className="tabbar__list">
        {TABS.slice(0, MIDDLE).map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              // `end` sólo en la raíz: sin él, "/" quedaría activa en todas
              // las rutas porque todas empiezan por "/".
              end={to === '/'}
              className={({ isActive }) =>
                `tabbar__tab${isActive ? ' tabbar__tab--active' : ''}`
              }
            >
              <Icon />
              <span className="tabbar__label">{label}</span>
            </NavLink>
          </li>
        ))}

        {/* Se sale hacia arriba de la barra: por eso vive dentro de la lista
            (para ocupar su lugar en el reparto) pero se posiciona aparte. */}
        <li className="tabbar__add-slot">
          <Link to="/agregar" className="tabbar__add" aria-label="Agregar moneda">
            <PlusIcon />
          </Link>
        </li>

        {TABS.slice(MIDDLE).map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `tabbar__tab${isActive ? ' tabbar__tab--active' : ''}`
              }
            >
              <Icon />
              <span className="tabbar__label">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

import { Outlet } from 'react-router-dom'
import { TabBar, type Tab } from '../shell/TabBar'
import { ChartIcon, CoinsIcon } from '../shell/icons'

/** Las dos secciones de la vitrina: la colección es la raíz del sitio. */
const PUBLIC_TABS: Tab[] = [
  { to: '/', label: 'Colección', Icon: CoinsIcon },
  { to: '/stats', label: 'Estadísticas', Icon: ChartIcon },
]

/**
 * El armazón de la vitrina abierta.
 *
 * Lleva la misma barra de pestañas fija que la app con sesión, sin el botón
 * de agregar: es la misma colección vista desde afuera, y cambiarle la
 * navegación la haría parecer otro sitio.
 */
export function PublicShell() {
  return (
    <div className="app app--tabbed">
      <Outlet />
      <TabBar tabs={PUBLIC_TABS} add={false} />
    </div>
  )
}

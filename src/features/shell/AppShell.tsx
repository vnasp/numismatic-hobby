import { Outlet } from 'react-router-dom'
import { TabBar } from './TabBar'

/**
 * Armazón de las cuatro secciones con pestañas. `/agregar` queda fuera a
 * propósito: es un flujo con principio y fin, y mostrar la navegación
 * invitaría a abandonarlo a medio llenar.
 */
export function AppShell() {
  return (
    <div className="app app--tabbed">
      <Outlet />
      <TabBar />
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { PersonIcon } from './icons'

export function AccountMenu() {
  const { signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)

  // Un clic fuera cierra el menú. Sin esto queda abierto mientras se navega
  // la página, tapando la primera fila de la grilla.
  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (!container.current?.contains(event.target as Node)) setIsOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className="account" ref={container}>
      <button
        type="button"
        className="account__trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Tu cuenta"
        onClick={() => setIsOpen((open) => !open)}
      >
        <PersonIcon size={20} />
      </button>

      {isOpen && (
        <div className="account__menu" role="menu">
          <button type="button" role="menuitem" onClick={() => signOut()}>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

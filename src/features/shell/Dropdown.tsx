import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDownIcon } from './icons'

export interface DropdownOption {
  value: string
  label: string
  /** Texto secundario al costado, como el recuento de un país. */
  hint?: string
}

interface Props {
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  /** Se usa cuando no hay un <label> asociado por id. */
  ariaLabel?: string
  /** Id del <label> que lo describe, para el patrón con etiqueta visible. */
  labelledBy?: string
  id?: string
  className?: string
  /** Qué mostrar si el valor no corresponde a ninguna opción. */
  placeholder?: string
}

/**
 * Menú desplegable propio, en reemplazo de `<select>`.
 *
 * El `<select>` nativo abre la rueda del sistema en móvil y no admite estilos
 * en su lista, así que las opciones se veían fuera del diseño. Este componente
 * sigue el patrón ARIA de listbox: el disparador anuncia estado y opción
 * elegida, y la lista se recorre con las flechas sin sacar el foco del botón.
 *
 * Teclado: ↑/↓ mueven, Home/Fin van a los extremos, Enter y Espacio eligen,
 * Escape cierra, Tab cierra y sigue de largo.
 */
export function Dropdown({
  options,
  value,
  onChange,
  ariaLabel,
  labelledBy,
  id,
  className,
  placeholder = 'Selecciona',
}: Props) {
  const generatedId = useId()
  const triggerId = id ?? generatedId
  const listId = `${triggerId}-lista`

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)

  const selectedIndex = options.findIndex((option) => option.value === value)
  const selected = selectedIndex === -1 ? null : options[selectedIndex]

  useEffect(() => {
    if (!open) return

    function handleOutside(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  function openList() {
    // Se abre sobre la opción vigente: es de donde se parte para moverse.
    setActive(selectedIndex === -1 ? 0 : selectedIndex)
    setOpen(true)
  }

  function choose(index: number) {
    const option = options[index]
    if (option) onChange(option.value)
    setOpen(false)
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (event.key === 'Tab') {
      setOpen(false)
      return
    }

    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        openList()
      }
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActive((current) => Math.min(current + 1, options.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActive((current) => Math.max(current - 1, 0))
        break
      case 'Home':
        event.preventDefault()
        setActive(0)
        break
      case 'End':
        event.preventDefault()
        setActive(options.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        choose(active)
        break
    }
  }

  return (
    <div className={`dropdown${className ? ` ${className}` : ''}`} ref={root}>
      <button
        type="button"
        id={triggerId}
        className="dropdown__trigger"
        role="combobox"
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-labelledby={labelledBy ? `${labelledBy} ${triggerId}` : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
      >
        <span className="dropdown__value">{selected?.label ?? placeholder}</span>
        <ChevronDownIcon size={16} />
      </button>

      {open && (
        <ul className="dropdown__list" id={listId} role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.value === value}
              className={`dropdown__option${index === active ? ' dropdown__option--active' : ''}`}
              // mousedown y no click: el blur del botón cerraría la lista antes
              // de que el clic llegara a la opción.
              onMouseDown={(event) => {
                event.preventDefault()
                choose(index)
              }}
              onMouseEnter={() => setActive(index)}
            >
              <span>{option.label}</span>
              {option.hint && <span className="dropdown__hint">{option.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { normalizeForSearch } from '../../../shared/numista/normalize'
import type { IssuerOption } from '../../lib/numista/proxyClient'

interface Props {
  issuers: IssuerOption[]
  value: string
  onChange: (issuerCode: string) => void
}

const ALL = { issuer_code: '', issuer_name: 'Todos los emisores' }

/**
 * Selector de país con búsqueda escrita en el propio campo.
 *
 * Antes era un botón que abría un panel con un buscador adentro: había que
 * desplegar y recién entonces escribir. Aquí el campo visible *es* el
 * buscador, así que escribir el país es un solo gesto.
 *
 * Sigue el patrón combobox de ARIA: el input anuncia `aria-expanded` y la
 * opción activa con `aria-activedescendant`, de modo que se puede recorrer la
 * lista con las flechas sin mover el foco fuera del campo.
 */
export function IssuerCombobox({ issuers, value, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const container = useRef<HTMLDivElement>(null)
  const listboxId = useId()
  const optionId = (i: number) => `${listboxId}-opt-${i}`

  const selected = issuers.find((item) => item.issuer_code === value) ?? null

  const options = useMemo(() => {
    const needle = normalizeForSearch(query)
    // Sin texto escrito se ofrece la lista entera, encabezada por la opción
    // de no filtrar por país.
    if (!needle) return [ALL, ...issuers]
    return issuers.filter((item) => normalizeForSearch(item.issuer_name).includes(needle))
  }, [query, issuers])

  // Un clic fuera cierra la lista y descarta lo tecleado a medias, para que el
  // campo no quede mostrando un texto que no corresponde a la selección.
  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(event: MouseEvent) {
      if (!container.current?.contains(event.target as Node)) close()
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  })

  function close() {
    setIsOpen(false)
    setQuery('')
    setActiveIndex(0)
  }

  function choose(option: { issuer_code: string }) {
    onChange(option.issuer_code)
    close()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      close()
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
        return
      }
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((i) => (i + step + options.length) % options.length)
      return
    }
    if (event.key === 'Enter' && isOpen) {
      // Evita que elegir un país envíe el formulario de búsqueda.
      event.preventDefault()
      const option = options[activeIndex]
      if (option) choose(option)
    }
  }

  return (
    <div className="issuer-combobox" ref={container}>
      <input
        id="issuer"
        className="input"
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={isOpen ? optionId(activeIndex) : undefined}
        placeholder="Todos los emisores"
        // Mientras se escribe manda lo tecleado; en reposo, el país elegido.
        value={isOpen ? query : (selected?.issuer_name ?? '')}
        onChange={(e) => {
          setQuery(e.target.value)
          setActiveIndex(0)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />

      {isOpen && (
        <ul className="issuer-combobox__list" role="listbox" aria-label="Emisores" id={listboxId}>
          {options.map((option, i) => (
            <li
              key={option.issuer_code || 'todos'}
              id={optionId(i)}
              role="option"
              aria-selected={option.issuer_code === value}
              className={`issuer-combobox__option${i === activeIndex ? ' issuer-combobox__option--active' : ''}`}
              // `mousedown` y no `click`: el clic llega después del blur, que
              // ya habría cerrado la lista y cancelado la selección.
              onMouseDown={(e) => {
                e.preventDefault()
                choose(option)
              }}
            >
              {option.issuer_name}
            </li>
          ))}
          {options.length === 0 && (
            <li className="issuer-combobox__empty">No se encontraron emisores.</li>
          )}
        </ul>
      )}
    </div>
  )
}

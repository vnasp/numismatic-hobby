import { useId, useState } from 'react'
import { InfoIcon } from '../shell/icons'

/**
 * Ayuda para identificar la emisión. Va plegada porque sólo hace falta la
 * primera vez: quien ya sabe leer el año y la ceca no necesita el texto
 * ocupando media pantalla en cada moneda que agrega.
 */
export function IssueHelp() {
  const [isOpen, setIsOpen] = useState(false)
  const panelId = useId()

  return (
    <>
      <button
        type="button"
        className="link-btn issue-help__trigger"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
      >
        ¿Cómo saberlo?
        <InfoIcon size={16} />
      </button>

      {isOpen && (
        <div className="issue-help__panel" id={panelId}>
          <p>
            El <strong>año</strong> está acuñado en la propia moneda, casi siempre
            bajo el motivo del reverso.
          </p>
          <p>
            La <strong>ceca</strong> es una o dos letras pequeñas junto al año o al
            borde: <code>So</code> es Santiago de Chile.
          </p>
          <p>
            Si tu moneda no coincide con ninguna de las opciones, o la letra no se
            alcanza a leer, elige <strong>No estoy segura de la emisión</strong>. Se
            puede corregir después.
          </p>
        </div>
      )}
    </>
  )
}

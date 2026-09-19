import { useEffect, useId, useRef } from 'react'

interface Props {
  title: string
  description?: string
  confirmLabel: string
  cancelLabel?: string
  isWorking?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Diálogo de confirmación para acciones que no se pueden deshacer.
 *
 * El foco arranca en "Cancelar" y no en el botón que destruye: si alguien
 * llega con el teclado y pulsa Enter por inercia, no borra nada. Escape y el
 * clic en el fondo cancelan.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  isWorking = false,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId()
  const descriptionId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    <div className="dialog-backdrop" onMouseDown={onCancel}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        // El clic dentro no debe cerrar: el fondo es quien cancela.
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className="dialog__title" id={titleId}>
          {title}
        </h2>
        {description && (
          <p className="dialog__text" id={descriptionId}>
            {description}
          </p>
        )}

        <div className="dialog__actions">
          <button type="button" className="btn btn--ghost" ref={cancelRef} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={onConfirm}
            disabled={isWorking}
          >
            {isWorking ? 'Eliminando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

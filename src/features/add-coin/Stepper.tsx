const STEPS = ['Buscar', 'Detalles', 'Confirmar'] as const

export type StepIndex = 0 | 1 | 2

interface Props {
  current: StepIndex
}

/**
 * Indicador de avance. No es navegable a propósito: volver atrás se hace con
 * la flecha de la barra superior, que es un único camino y evita dejar el
 * flujo en un estado imposible (por ejemplo, el paso 3 sin moneda elegida).
 */
export function Stepper({ current }: Props) {
  return (
    <ol className="stepper" aria-label="Progreso">
      {STEPS.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo'
        return (
          <li
            key={label}
            className={`stepper__step stepper__step--${state}`}
            aria-current={i === current ? 'step' : undefined}
          >
            <span className="stepper__dot" aria-hidden="true">
              {i + 1}
            </span>
            <span className="stepper__label">
              {label}
              <span className="sr-only">
                {state === 'done'
                  ? ' (completado)'
                  : state === 'current'
                    ? ' (paso actual)'
                    : ' (pendiente)'}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

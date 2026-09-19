import { BackIcon, CloseIcon } from '../shell/icons'

interface Props {
  title: string
  onBack: () => void
  backLabel: string
  onClose: () => void
}

export function FlowBar({ title, onBack, backLabel, onClose }: Props) {
  return (
    <header className="app-bar">
      <div className="app-bar__inner flow-bar">
        <button type="button" className="icon-btn" onClick={onBack} aria-label={backLabel}>
          <BackIcon />
        </button>
        <h1 className="app-bar__title flow-bar__title">{title}</h1>
        <button
          type="button"
          className="icon-btn"
          onClick={onClose}
          aria-label="Salir sin guardar"
        >
          <CloseIcon />
        </button>
      </div>
    </header>
  )
}

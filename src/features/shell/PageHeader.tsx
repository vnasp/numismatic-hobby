import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: ReactNode
  action?: ReactNode
}

export function PageHeader({ title, subtitle, action }: Props) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        <h1>{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

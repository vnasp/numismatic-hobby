import { useMemo } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { AccountMenu } from '../shell/AccountMenu'
import { AppShell } from '../shell/AppShell'
import { PageHeader } from '../shell/PageHeader'
import { DownloadIcon } from '../shell/icons'
import { PublicShell } from '../public/PublicShell'
import { useCollection } from '../collection/useCollection'
import { usePublicCollection } from '../public/usePublicCollection'
import { StatsView } from './StatsView'
import { downloadCsv } from './collectionCsv'
import { applyStatsFilter, isFilterActive, useStatsFilter } from './statsFilter'
import type { CollectionEntry } from '../collection/useCollection'

/**
 * La descarga.
 *
 * Baja lo que está a la vista: sin filtros puestos eso es la colección
 * entera, y con un cruce armado es justo ese cruce, que suele ser el motivo
 * por el que alguien quiere el archivo. El botón dice cuántas filas van a
 * salir para que no haya sorpresa al abrirlo.
 */
function ExportButton({ entries }: { entries: CollectionEntry[] }) {
  const { filter } = useStatsFilter()
  const visible = useMemo(() => applyStatsFilter(entries, filter), [entries, filter])

  if (visible.length === 0) return null

  return (
    <div className="stats__export">
      <button type="button" className="btn btn--ghost" onClick={() => downloadCsv(visible)}>
        <DownloadIcon size={18} />
        {isFilterActive(filter)
          ? `Exportar estas ${visible.length} a CSV`
          : `Exportar la colección a CSV (${visible.length})`}
      </button>
      <p className="stats__export-hint">
        Una fila por moneda, con la valoración y todo lo que la vitrina no muestra.
      </p>
    </div>
  )
}

/**
 * `/stats`: una sola pantalla para las dos mitades de la app.
 *
 * Con sesión lee `coins_items` y muestra la colección completa —la
 * valoración, el material, los tamaños de cartón, la conservación y las
 * favoritas—; sin ella lee la vista pública y eso no aparece: queda el
 * catálogo, que es de dónde son las monedas y de cuándo. No es una
 * pantalla que oculte campos: el recorte empieza en qué se consulta, y
 * `showPrivate` sólo evita dibujar secciones que sin sesión quedarían
 * vacías o dirían más de la colección de lo que corresponde contarle a
 * quien pasa.
 *
 * Los dos hooks se llaman siempre y se apaga el que no toca: llamar a uno u
 * otro según la sesión rompería la regla de los hooks.
 */
export function StatsPage() {
  const { session, loading } = useAuth()
  const privada = Boolean(session)

  const propia = useCollection({ enabled: !loading && privada })
  const publica = usePublicCollection({ enabled: !loading && !privada })
  const { data, isLoading, error } = privada ? propia : publica

  const entries = data ?? []

  return (
    <StatsView
      entries={entries}
      isLoading={loading || isLoading}
      error={error}
      showPrivate={privada}
      header={
        privada ? (
          <PageHeader title="Estadísticas" action={<AccountMenu />} />
        ) : (
          <PageHeader
            title="La colección en números"
            subtitle="Cruza continente, país y década."
          />
        )
      }
      action={privada ? <ExportButton entries={entries} /> : null}
    />
  )
}

/**
 * El armazón de `/stats`, que cambia con la sesión.
 *
 * Es la misma barra de pestañas en los dos casos, con las secciones que
 * corresponden: las cuatro de la app con sesión, o las dos de la vitrina.
 */
export function StatsShell() {
  const { session } = useAuth()
  return session ? <AppShell /> : <PublicShell />
}

import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AccountMenu } from '../shell/AccountMenu'
import { PageHeader } from '../shell/PageHeader'
import { useMeta, type MetaSlot } from './useMeta'
import { MetaImport } from './MetaImport'

/** El rango en texto: «desde 1900», «1900–1975». */
function periodo(from: number | null, to: number | null): string {
  if (from && to) return `${from}–${to}`
  if (from) return `desde ${from}`
  if (to) return `hasta ${to}`
  return 'de cualquier año'
}

function anios(slot: MetaSlot): string | null {
  const min = Math.min(...slot.types.map((t) => t.minYear ?? Infinity))
  const max = Math.max(...slot.types.map((t) => t.maxYear ?? -Infinity))
  if (!Number.isFinite(min)) return null
  return min === max ? String(min) : `${min}–${max}`
}

/**
 * Una casilla de la meta.
 *
 * La que se tiene muestra la moneda; la que falta muestra el hueco, con su
 * número y sus años. Ese contraste es el punto de la pantalla: una grilla
 * donde todo se ve igual no dice qué falta, que es lo único que se viene a
 * mirar acá.
 */
function Slot({ slot }: { slot: MetaSlot }) {
  const [fotoRota, setFotoRota] = useState(false)
  const conFoto = slot.types.find((type) => type.owned && type.thumbnail) ?? slot.types[0]
  const rango = anios(slot)
  const muestraFoto = slot.owned && Boolean(conFoto?.thumbnail) && !fotoRota

  return (
    <li className={`meta-slot${slot.owned ? ' meta-slot--owned' : ''}`}>
      <div className="meta-slot__disc">
        {muestraFoto ? (
          <img
            src={conFoto.thumbnail!}
            alt=""
            loading="lazy"
            onError={() => setFotoRota(true)}
          />
        ) : (
          /* Dos vacíos distintos, y la diferencia importa: el disco lleno
             es una casilla conseguida a la que Numista no le tiene foto, y
             el aro punteado es el hueco del cartón. Usar el mismo dibujo
             para las dos haría contar de menos con sólo mirar. */
          <span
            className={slot.owned ? 'meta-slot__blank' : 'meta-slot__hole'}
            aria-hidden="true"
          />
        )}
      </div>
      <span className="meta-slot__ref">{slot.reference ?? 'Sin bajar'}</span>
      {rango && <span className="meta-slot__years">{rango}</span>}
      {slot.types.length > 1 && (
        <span className="meta-slot__variants">
          {slot.types.length} variantes
        </span>
      )}
      <span className="sr-only">{slot.owned ? 'La tienes' : 'Te falta'}</span>
    </li>
  )
}

export function MetaPage() {
  const { slug = '' } = useParams()
  const { data: meta, isLoading, error } = useMeta(slug)

  const avance = useMemo(() => {
    if (!meta) return { tengo: 0, total: 0, porcentaje: 0 }
    const tengo = meta.slots.filter((slot) => slot.owned).length
    const total = meta.slots.length
    return { tengo, total, porcentaje: total ? Math.round((tengo / total) * 100) : 0 }
  }, [meta])

  return (
    <main className="app__main stack">
      <div className="page-hero">
        <PageHeader
          title={meta?.name ?? 'Meta'}
          subtitle={
            meta && `Monedas de circulación con número de catálogo, ${periodo(meta.fromYear, meta.toYear)}.`
          }
          action={<AccountMenu />}
        />
      </div>

      {isLoading && <p className="notice">Cargando la meta…</p>}
      {error && (
        <p className="alert alert--error" role="alert">
          {(error as Error).message}
        </p>
      )}

      {!isLoading && !error && !meta && (
        <div className="notice">
          <p className="notice__title">Esa meta no existe</p>
          <p>
            <Link to="/paises">Vuelve a Países</Link> para ver las que hay.
          </p>
        </div>
      )}

      {meta && (
        <>
          {/* La importación va arriba mientras falte algo por traer: es lo
              que hay que hacer antes de que la grilla signifique algo. */}
          <MetaImport meta={meta} />

          {meta.slots.length > 0 && (
            <>
              <section className="card meta-progress">
                <div className="meta-progress__figures">
                  <span className="meta-progress__count">
                    {avance.tengo}
                    <span className="meta-progress__of"> de {avance.total}</span>
                  </span>
                  <span className="meta-progress__pct">{avance.porcentaje} %</span>
                </div>
                {/* La barra es el mismo dato que el número, para poder
                    medirlo de un vistazo contra el largo total. */}
                <div
                  className="meta-progress__track"
                  role="img"
                  aria-label={`${avance.tengo} de ${avance.total} conseguidas, un ${avance.porcentaje} por ciento`}
                >
                  <span
                    className="meta-progress__fill"
                    style={{ inlineSize: `${avance.porcentaje}%` }}
                  />
                </div>
                <p className="meta-progress__hint">
                  Te faltan {avance.total - avance.tengo}. Cada casilla es un número de
                  catálogo, no un año: con un ejemplar de cualquier año se da por conseguida.
                </p>
              </section>

              <ul className="meta-grid">
                {meta.slots.map((slot) => (
                  <Slot key={slot.reference ?? slot.types[0].numistaId} slot={slot} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </main>
  )
}

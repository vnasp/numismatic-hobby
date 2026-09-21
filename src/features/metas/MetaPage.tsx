import { useMemo } from 'react'
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
 * Sin foto a propósito. La grilla es para barrer setenta y siete números y
 * ver dónde están los huecos, y un disco de 56 px por casilla obliga a
 * desplazarse tres pantallas para hacerlo. Lo que sí hace falta cuando una
 * falta es poder ir a verla, y para eso está el enlace a la ficha de
 * Numista.
 *
 * La que falta no se distingue sólo por el color: lleva además el aro
 * hueco, que es el mismo hueco del cartón.
 */
function Slot({ slot }: { slot: MetaSlot }) {
  const rango = anios(slot)
  const estado = slot.owned ? 'La tienes' : 'Te falta'

  const contenido = (
    <>
      <span className="meta-slot__dot" aria-hidden="true" />
      <span className="meta-slot__ref">{slot.reference ?? 'Sin bajar'}</span>
      {rango && <span className="meta-slot__years">{rango}</span>}
      {slot.types.length > 1 && (
        <span className="meta-slot__variants">{slot.types.length} variantes</span>
      )}
      <span className="sr-only">{estado}</span>
    </>
  )

  return (
    <li className={`meta-slot${slot.owned ? ' meta-slot--owned' : ''}`}>
      {/* Sin ficha no hay enlace: la URL la da Numista en el detalle, y
          armarla concatenando el id sería inventar su forma. */}
      {slot.url ? (
        <a
          className="meta-slot__link"
          href={slot.url}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`${slot.reference ?? 'Sin bajar'}, ${estado.toLowerCase()}. Ver en Numista`}
        >
          {contenido}
        </a>
      ) : (
        <div className="meta-slot__link meta-slot__link--plain">{contenido}</div>
      )}
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

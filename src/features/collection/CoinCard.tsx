import { useState } from 'react'
import { gradeName, gradeShort } from '../../lib/grades'
import { formatReference } from '../../../shared/numista/references'
import { TrashIcon } from '../shell/icons'
import type { CollectionEntry } from './useCollection'

interface Props {
  entry: CollectionEntry
  onToggleFavorite?: (entry: CollectionEntry) => void
  /** Pide eliminar: la confirmación la hace quien recibe el aviso. */
  onDelete?: (entry: CollectionEntry) => void
  /** Abre la ficha con el material, el diámetro y la valoración. */
  onOpen?: (entry: CollectionEntry) => void
}

export function CoinCard({ entry, onToggleFavorite, onDelete, onOpen }: Props) {
  // Una URL de Numista puede expirar o fallar en el momento: se oculta la
  // imagen en vez de dejar el ícono roto en la grilla de 200+ monedas.
  const [imgFailed, setImgFailed] = useState(false)
  const [backFailed, setBackFailed] = useState(false)
  // En el celular no hay puntero que pase por encima, así que la moneda se da
  // vuelta tocándola. En escritorio el hover sigue funcionando igual.
  const [flipped, setFlipped] = useState(false)

  const hasImage = Boolean(entry.thumbnail) && !imgFailed
  const hasBack = hasImage && Boolean(entry.thumbnailBack) && !backFailed
  // Emisor y año en una sola línea: son dos datos cortos que se leen juntos
  // y separarlos gastaba dos renglones de una ficha muy angosta.
  const origin = [entry.issuerName, entry.issueYear].filter(Boolean).join(' · ')

  return (
    <article className="coin-card">
      <div className={`coin-card__well${hasImage ? '' : ' coin-card__well--empty'}`}>
        {hasImage ? (
          <Flipper entry={entry} enabled={hasBack} onFlip={() => setFlipped((v) => !v)}>
            <span
              className={`coin-card__disc${flipped ? ' coin-card__disc--flipped' : ''}`}
            >
              <img
                className="coin-card__img"
                src={entry.thumbnail!}
                alt=""
                width={120}
                height={120}
                loading="lazy"
                onError={() => setImgFailed(true)}
              />
              {/* La otra cara se apila encima y aparece al pasar el puntero,
                  al enfocar la ficha con el teclado o al tocar la moneda.
                  Es decorativa: el dato que identifica la moneda ya
                  está en el título. */}
              {hasBack && (
                <img
                  className="coin-card__img coin-card__img--back"
                  src={entry.thumbnailBack!}
                  alt=""
                  width={120}
                  height={120}
                  loading="lazy"
                  onError={() => setBackFailed(true)}
                />
              )}
            </span>
          </Flipper>
        ) : (
          // Sin foto se conserva el hueco circular para que la grilla no se
          // desarme: todas las fichas mantienen la misma altura.
          <span className="coin-card__placeholder" aria-hidden="true" />
        )}

        {onToggleFavorite && (
          <button
            type="button"
            className="coin-card__fav"
            aria-pressed={entry.isFavorite}
            aria-label={
              entry.isFavorite
                ? `Quitar ${entry.title} de favoritas`
                : `Marcar ${entry.title} como favorita`
            }
            onClick={() => onToggleFavorite(entry)}
          >
            <HeartIcon filled={entry.isFavorite} />
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            className="coin-card__delete"
            aria-label={`Eliminar ${entry.title} de mi colección`}
            onClick={() => onDelete(entry)}
          >
            <TrashIcon size={18} />
          </button>
        )}
      </div>

      <div className="coin-card__body">
        <h3 className="coin-card__title">
          {onOpen ? (
            // La ficha se abre desde el título: el clic sobre la moneda ya
            // está tomado para darla vuelta.
            <button type="button" className="coin-card__open" onClick={() => onOpen(entry)}>
              {entry.title}
            </button>
          ) : (
            entry.title
          )}
        </h3>
        {origin && <p className="coin-card__origin">{origin}</p>}

        {(entry.reference || entry.grade) && (
          <p className="coin-card__meta">
            {entry.reference && (
              <span className="badge badge--km">{formatReference(entry.reference)}</span>
            )}
            {entry.grade && (
              <span className="badge">
                {gradeShort(entry.grade)}
                {/* La sigla basta en pantalla; el nombre completo queda para
                    quien navega con lector de pantalla. */}
                <span className="sr-only">{gradeName(entry.grade)}</span>
              </span>
            )}
          </p>
        )}
      </div>
    </article>
  )
}

/**
 * Envuelve la moneda en un botón cuando hay una segunda cara que mostrar, y
 * la deja tal cual cuando Numista sólo tiene una foto: un botón que no hace
 * nada confunde, sobre todo con lector de pantalla.
 */
function Flipper({
  entry,
  enabled,
  onFlip,
  children,
}: {
  entry: CollectionEntry
  enabled: boolean
  onFlip: () => void
  children: React.ReactNode
}) {
  if (!enabled) return <>{children}</>

  return (
    <button
      type="button"
      className="coin-card__flipper"
      aria-label={`Ver la otra cara de ${entry.title}`}
      onClick={onFlip}
    >
      {children}
    </button>
  )
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        d="M12 20.3 3.9 12.2a5.1 5.1 0 0 1 7.2-7.2l.9.9.9-.9a5.1 5.1 0 0 1 7.2 7.2z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

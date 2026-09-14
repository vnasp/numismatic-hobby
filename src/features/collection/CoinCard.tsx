import { useState } from 'react'
import { gradeLabel } from '../../lib/grades'
import type { CollectionEntry } from './useCollection'

export function CoinCard({ entry }: { entry: CollectionEntry }) {
  // Una URL de Numista puede expirar o fallar en el momento: se oculta la
  // imagen en vez de dejar el ícono roto en la grilla de 200+ monedas.
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <article>
      {entry.thumbnail && !imgFailed && (
        <img
          src={entry.thumbnail}
          alt=""
          width={120}
          height={120}
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      )}
      <h3>{entry.title}</h3>
      {entry.issuerName && <p>{entry.issuerName}</p>}
      {entry.issueYear && <p>{entry.issueYear}</p>}
      {entry.kmNumber && <p>KM #{entry.kmNumber}</p>}
      {entry.grade && <p>{gradeLabel(entry.grade)}</p>}
    </article>
  )
}

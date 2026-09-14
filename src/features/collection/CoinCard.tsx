import { gradeLabel } from '../../lib/grades'
import type { CollectionEntry } from './useCollection'

export function CoinCard({ entry }: { entry: CollectionEntry }) {
  return (
    <article>
      {entry.thumbnail && <img src={entry.thumbnail} alt="" width={120} height={120} />}
      <h3>{entry.title}</h3>
      {entry.issuerName && <p>{entry.issuerName}</p>}
      {entry.issueYear && <p>{entry.issueYear}</p>}
      {entry.kmNumber && <p>KM #{entry.kmNumber}</p>}
      {entry.grade && <p>{gradeLabel(entry.grade)}</p>}
    </article>
  )
}

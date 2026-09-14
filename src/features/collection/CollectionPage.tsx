import { Link } from 'react-router-dom'
import { useCollection } from './useCollection'
import { CoinCard } from './CoinCard'

export function CollectionPage() {
  const { data, isLoading, error } = useCollection()

  return (
    <main>
      <h1>Mi Colección de Monedas</h1>
      <Link to="/agregar">Agregar moneda</Link>

      {isLoading && <p>Cargando colección…</p>}
      {error && <p role="alert">{(error as Error).message}</p>}

      {data && (
        <>
          <p>{data.length} monedas</p>
          {data.length === 0 ? (
            <p>Todavía no tienes monedas registradas. Empieza agregando una por su número KM.</p>
          ) : (
            <div>
              {data.map((entry) => <CoinCard key={entry.id} entry={entry} />)}
            </div>
          )}
        </>
      )}
    </main>
  )
}

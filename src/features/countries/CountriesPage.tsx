import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AccountMenu } from '../shell/AccountMenu'
import { PageHeader } from '../shell/PageHeader'
import { countryTallies } from '../collection/collectionData'
import { useCollection } from '../collection/useCollection'
import { useMetas } from '../metas/useMetas'

export function CountriesPage() {
  const { data, isLoading, error } = useCollection()
  const { data: metas } = useMetas()
  const countries = useMemo(() => countryTallies(data ?? []), [data])

  // La barra de cada país se mide contra el país más representado, no contra
  // el total: con 20 países, medir contra el total deja todas las barras
  // indistinguibles cerca de cero.
  const max = countries[0]?.count ?? 0

  return (
    <main className="app__main">
      <div className="page-hero">
        <PageHeader
          title="Países"
          subtitle={data && `${countries.length} en tu colección`}
          action={<AccountMenu />}
        />
      </div>

      {/* Las metas van antes que el recuento: son lo que se persigue, y el
          recuento es lo que ya se tiene. */}
      {metas && metas.length > 0 && (
        <ul className="meta-links">
          {metas.map((meta) => (
            <li key={meta.slug}>
              <Link className="meta-link" to={`/metas/${meta.slug}`}>
                <span className="meta-link__name">{meta.name}</span>
                <span className="meta-link__hint">Ver qué falta</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {isLoading && <p className="notice">Cargando colección…</p>}
      {error && (
        <p className="alert alert--error" role="alert">
          {(error as Error).message}
        </p>
      )}

      {data && countries.length === 0 && (
        <div className="notice">
          <p className="notice__title">Todavía no hay países</p>
          <p>Aparecerán aquí a medida que agregues monedas.</p>
        </div>
      )}

      {countries.length > 0 && (
        <ul className="tally-list">
          {countries.map((country) => (
            <li key={country.name}>
              <Link
                className="tally"
                to={`/coleccion?pais=${encodeURIComponent(country.name)}`}
                aria-label={`Ver las ${country.count} monedas de ${country.name}`}
              >
                <span className="tally__label">{country.name}</span>
                <span className="tally__count">{country.count}</span>
                <span
                  className="tally__bar"
                  style={{ inlineSize: `${(country.count / max) * 100}%` }}
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

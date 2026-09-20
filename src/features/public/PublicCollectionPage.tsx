import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../shell/PageHeader'
import { SearchIcon } from '../shell/icons'
import { Dropdown } from '../shell/Dropdown'
import { CoinCard } from '../collection/CoinCard'
import {
  continentTallies,
  countryTallies,
  filterEntries,
  inContinent,
  sortEntries,
} from '../collection/collectionData'
import { usePublicCollection } from './usePublicCollection'

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}

/**
 * La vitrina abierta: la colección en modo lectura, sin sesión.
 *
 * Es la misma grilla de la colección privada, sin lo que sólo tiene sentido
 * para la dueña: no hay favoritos, ni papelera, ni ficha con valoración, ni
 * botón de agregar. Los datos vienen de `coins_public_items`, que no expone
 * ubicación, notas ni precios.
 *
 * Se ordena por continente, país y catálogo, que es como se recorre una
 * colección ajena, y no por fecha de alta, que sólo le importa a quien la
 * arma.
 */
export function PublicCollectionPage() {
  const { data, isLoading, error } = usePublicCollection()
  const [query, setQuery] = useState('')
  const [params, setParams] = useSearchParams()
  const country = params.get('pais')
  const continent = params.get('continente')

  const entries = useMemo(() => data ?? [], [data])
  const allCountries = useMemo(() => countryTallies(entries), [entries])
  const continents = useMemo(() => continentTallies(entries), [entries])
  const countries = useMemo(
    () => countryTallies(entries.filter((entry) => inContinent(entry, continent))),
    [entries, continent],
  )
  const visible = useMemo(
    () => sortEntries(filterEntries(entries, { query, country, continent }), 'km'),
    [entries, query, country, continent],
  )

  function setParam(name: string, value: string | null) {
    if (value) {
      params.set(name, value)
    } else {
      params.delete(name)
    }
    setParams(params, { replace: true })
  }

  function handleContinentChange(value: string | null) {
    const keepsCountry = entries.some(
      (entry) => inContinent(entry, value) && entry.issuerName === country,
    )
    if (!keepsCountry) params.delete('pais')
    setParam('continente', value)
  }

  return (
    <div className="app">
      <main className="app__main">
        <div className="page-hero">
          <PageHeader
            title="Una colección de monedas"
            subtitle={
              data && (
                <>
                  {plural(entries.length, 'moneda', 'monedas')} ·{' '}
                  {plural(allCountries.length, 'país', 'países')}
                </>
              )
            }
          />

          {data && continents.length > 1 && (
            <div className="continent-filter" role="group" aria-label="Filtrar por continente">
              <button
                type="button"
                className="continent-filter__option"
                aria-pressed={!continent}
                onClick={() => handleContinentChange(null)}
              >
                Todos
              </button>
              {continents.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="continent-filter__option"
                  aria-pressed={continent === item.label}
                  onClick={() =>
                    handleContinentChange(continent === item.label ? null : item.label)
                  }
                >
                  {item.label} <span className="continent-filter__count">{item.count}</span>
                </button>
              ))}
            </div>
          )}

          {data && entries.length > 0 && (
            <div className="filters">
              <div className="searchbox">
                <span className="searchbox__icon">
                  <SearchIcon size={18} />
                </span>
                <input
                  className="searchbox__input"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar en la colección…"
                  aria-label="Buscar en la colección"
                />
              </div>
              <Dropdown
                className="dropdown--pill filters__country"
                ariaLabel="Filtrar por país"
                value={country ?? ''}
                onChange={(value) => setParam('pais', value)}
                options={[
                  { value: '', label: 'Todas' },
                  ...countries.map((item) => ({
                    value: item.name,
                    label: item.name,
                    hint: String(item.count),
                  })),
                ]}
              />
            </div>
          )}
        </div>

        {isLoading && <p className="notice">Cargando colección…</p>}
        {error && (
          <p className="alert alert--error" role="alert">
            {(error as Error).message}
          </p>
        )}

        {data && entries.length === 0 && (
          <div className="notice">
            <p className="notice__title">Todavía no hay monedas</p>
            <p>Vuelve más adelante: la vitrina se va llenando de a poco.</p>
          </div>
        )}

        {data && entries.length > 0 && visible.length === 0 && (
          <div className="notice">
            <p className="notice__title">Ninguna moneda coincide</p>
            <p>Prueba con otro texto o quita los filtros.</p>
          </div>
        )}

        {visible.length > 0 && (
          <ul className="coin-grid">
            {visible.map((entry) => (
              <li key={entry.id}>
                {/* Sin acciones: la tarjeta queda en modo lectura. */}
                <CoinCard entry={entry} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

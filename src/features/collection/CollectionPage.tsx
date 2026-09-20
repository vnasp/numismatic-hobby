import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AccountMenu } from '../shell/AccountMenu'
import { PageHeader } from '../shell/PageHeader'
import { GridIcon, ListIcon, SearchIcon } from '../shell/icons'
import { Dropdown } from '../shell/Dropdown'
import {
  SORT_OPTIONS,
  continentTallies,
  countryTallies,
  filterEntries,
  inContinent,
  isCollectionSort,
  isCollectionView,
  sortEntries,
} from './collectionData'
import { useCollection, type CollectionEntry } from './useCollection'
import { useToggleFavorite } from './useToggleFavorite'
import { useDeleteItem } from './useDeleteItem'
import { ConfirmDialog } from '../shell/ConfirmDialog'
import { CoinDetail } from './CoinDetail'
import { CoinCard } from './CoinCard'

/** "1 moneda" / "4 monedas": el contador del encabezado se lee, no se abrevia. */
function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}

export function CollectionPage() {
  const { data, isLoading, error } = useCollection()
  const toggleFavorite = useToggleFavorite()
  const deleteItem = useDeleteItem()
  // La moneda que se está por eliminar, mientras se confirma.
  const [pendingDelete, setPendingDelete] = useState<CollectionEntry | null>(null)
  // La moneda cuya ficha se está mirando.
  const [detail, setDetail] = useState<CollectionEntry | null>(null)
  const [query, setQuery] = useState('')

  // El país filtrado vive en la URL y no en el estado del componente, para que
  // la página de Países pueda enlazar directo a "/coleccion?pais=Chile" y para
  // que el botón atrás del navegador deshaga el filtro.
  const [params, setParams] = useSearchParams()
  const country = params.get('pais')
  const continent = params.get('continente')
  const sortParam = params.get('orden')
  const sort = isCollectionSort(sortParam) ? sortParam : 'recientes'
  const viewParam = params.get('vista')
  const view = isCollectionView(viewParam) ? viewParam : 'grilla'

  const entries = useMemo(() => data ?? [], [data])
  // El conteo del encabezado es de toda la colección; el selector de país
  // sólo ofrece los del continente elegido.
  const allCountries = useMemo(() => countryTallies(entries), [entries])
  const continents = useMemo(() => continentTallies(entries), [entries])
  const countries = useMemo(
    () => countryTallies(entries.filter((entry) => inContinent(entry, continent))),
    [entries, continent],
  )
  const visible = useMemo(
    () => sortEntries(filterEntries(entries, { query, country, continent }), sort),
    [entries, query, country, continent, sort],
  )

  function handleViewChange(value: 'grilla' | 'lista') {
    if (value === 'grilla') {
      params.delete('vista')
    } else {
      params.set('vista', value)
    }
    setParams(params, { replace: true })
  }

  function handleSortChange(value: string) {
    if (value === 'recientes') {
      params.delete('orden')
    } else {
      params.set('orden', value)
    }
    setParams(params, { replace: true })
  }

  function handleCountryChange(value: string) {
    if (value) {
      params.set('pais', value)
    } else {
      params.delete('pais')
    }
    setParams(params, { replace: true })
  }

  function handleContinentChange(value: string | null) {
    if (value) {
      params.set('continente', value)
    } else {
      params.delete('continente')
    }
    // Un país de otro continente dejaría la grilla vacía sin razón visible.
    const keepsCountry = entries.some(
      (entry) => inContinent(entry, value) && entry.issuerName === country,
    )
    if (!keepsCountry) params.delete('pais')
    setParams(params, { replace: true })
  }

  const isFiltered = Boolean(query || country || continent)

  return (
    <main className="app__main">
      <div className="page-hero">
        <PageHeader
          title="Mi colección"
          subtitle={
            data && (
              <>
                {plural(entries.length, 'moneda', 'monedas')} ·{' '}
                {plural(allCountries.length, 'país', 'países')}
              </>
            )
          }
          action={<AccountMenu />}
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
                onClick={() => handleContinentChange(continent === item.label ? null : item.label)}
              >
                {item.label} <span className="continent-filter__count">{item.count}</span>
              </button>
            ))}
          </div>
        )}

        <div className="toolbar">
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
                  placeholder="Buscar en mi colección…"
                  aria-label="Buscar en mi colección"
                />
              </div>
              <Dropdown
                className="dropdown--pill filters__country"
                ariaLabel="Filtrar por país"
                value={country ?? ''}
                onChange={handleCountryChange}
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

          {data && entries.length > 1 && (
            <div className="sort-bar">
              <label className="sort-bar__label" htmlFor="orden">
                Ordenar
              </label>
              <Dropdown
                id="orden"
                className="dropdown--pill sort-bar__select"
                value={sort}
                onChange={handleSortChange}
                options={SORT_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
              />

              <div className="view-switch" role="group" aria-label="Forma de ver la colección">
                <button
                  type="button"
                  className="view-switch__option"
                  aria-pressed={view === 'grilla'}
                  aria-label="Ver en grilla"
                  onClick={() => handleViewChange('grilla')}
                >
                  <GridIcon size={18} />
                </button>
                <button
                  type="button"
                  className="view-switch__option"
                  aria-pressed={view === 'lista'}
                  aria-label="Ver en lista"
                  onClick={() => handleViewChange('lista')}
                >
                  <ListIcon size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading && <p className="notice">Cargando colección…</p>}
      {error && (
        <p className="alert alert--error" role="alert">
          {(error as Error).message}
        </p>
      )}
      {deleteItem.error && (
        <p className="alert alert--error" role="alert">
          {(deleteItem.error as Error).message}
        </p>
      )}
      {toggleFavorite.error && (
        <p className="alert alert--error" role="alert">
          {(toggleFavorite.error as Error).message}
        </p>
      )}

      {data && entries.length === 0 && (
        <div className="notice">
          <p className="notice__title">Tu vitrina está vacía</p>
          <p>
            Todavía no tienes monedas registradas. Empieza agregando una por su
            número KM.
          </p>
        </div>
      )}

      {data && entries.length > 0 && visible.length === 0 && (
        <div className="notice">
          <p className="notice__title">Ninguna moneda coincide</p>
          <p>Prueba con otro texto o quita los filtros de continente y país.</p>
        </div>
      )}

      {visible.length > 0 && (
        <>
          {isFiltered && (
            <p className="eyebrow filters__count">
              {plural(visible.length, 'coincidencia', 'coincidencias')}
            </p>
          )}
          <ul className={`coin-grid${view === 'lista' ? ' coin-grid--list' : ''}`}>
            {visible.map((entry) => (
              <li key={entry.id}>
                <CoinCard
                  entry={entry}
                  onToggleFavorite={(item) =>
                    toggleFavorite.mutate({ id: item.id, isFavorite: !item.isFavorite })
                  }
                  onDelete={setPendingDelete}
                  onOpen={setDetail}
                />
              </li>
            ))}
          </ul>
        </>
      )}
      {detail && (
        // La ficha se re-lee de la colección en cada render: si se guarda una
        // valoración, la que se está mirando queda al día sin cerrarla.
        <CoinDetail
          entry={entries.find((item) => item.id === detail.id) ?? detail}
          onClose={() => setDetail(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={`¿Eliminar ${pendingDelete.title}?`}
          description="La moneda se quita de tu colección. Esto no se puede deshacer, pero puedes volver a agregarla."
          confirmLabel="Eliminar"
          isWorking={deleteItem.isPending}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            deleteItem.mutate(pendingDelete.id)
            setPendingDelete(null)
          }}
        />
      )}

    </main>
  )
}

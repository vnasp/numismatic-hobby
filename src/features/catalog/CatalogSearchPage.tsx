import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { NumistaQuotaError } from '../../../shared/numista/errors'
import { getCachedIssuers, searchCatalogue } from '../../lib/numista/proxyClient'
import { AccountMenu } from '../shell/AccountMenu'
import { PageHeader } from '../shell/PageHeader'
import { Dropdown } from '../shell/Dropdown'
import { TypeResultList } from '../add-coin/TypeResultList'

/**
 * Búsqueda del catálogo de Numista por país, denominación y año, para cuando
 * no se conoce el número KM. El flujo de agregar (el botón "+") sigue siendo
 * la entrada por KM, que es la vía rápida cuando el número ya se tiene.
 */
export function CatalogSearchPage() {
  const navigate = useNavigate()
  const issuers = useQuery({ queryKey: ['issuers', 'visible-v2'], queryFn: getCachedIssuers })

  const [issuer, setIssuer] = useState('')
  const [q, setQ] = useState('')
  const [year, setYear] = useState('')

  const search = useMutation({
    mutationFn: () => searchCatalogue({ issuer, q, year }),
  })

  // La API exige al menos uno de los tres; sin esto el error llega desde el
  // proxy en vez de evitarse aquí.
  const canSearch = Boolean(issuer || q.trim() || year.trim())

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSearch) return
    search.mutate()
  }

  return (
    <main className="app__main stack">
      <div className="page-hero">
        <PageHeader
          title="Buscar"
          subtitle="En el catálogo de Numista, cuando no sabes el KM"
          action={<AccountMenu />}
        />
      </div>

      <form className="form card" onSubmit={handleSubmit}>
        <div className="field">
          <label className="field__label" htmlFor="catalog-issuer">
            País
          </label>
          <Dropdown
            id="catalog-issuer"
            value={issuer}
            onChange={setIssuer}
            options={[
              { value: '', label: 'Todos los países' },
              ...(issuers.data ?? []).map((item) => ({
                value: item.issuer_code,
                label: item.issuer_name,
              })),
            ]}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="catalog-q">
            Denominación
          </label>
          <input
            className="input"
            id="catalog-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Por ejemplo: 1 peso"
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="catalog-year">
            Año
          </label>
          <input
            className="input"
            id="catalog-year"
            inputMode="numeric"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Por ejemplo: 1955"
          />
        </div>

        <button
          type="submit"
          className="btn btn--primary btn--block"
          disabled={!canSearch || search.isPending}
        >
          {search.isPending ? 'Buscando…' : 'Buscar'}
        </button>
        {!canSearch && (
          <p className="field__hint">Completa al menos uno de los tres campos.</p>
        )}
      </form>

      {search.data && (
        <TypeResultList
          types={search.data.types}
          onSelect={(type) => navigate(`/agregar?tipo=${type.id}`)}
        />
      )}

      {search.error && (
        <p className="alert alert--error" role="alert">
          {search.error instanceof NumistaQuotaError
            ? 'Se agotó la cuota mensual de la API de Numista. Las monedas ya consultadas siguen disponibles; vuelve a intentarlo el próximo mes.'
            : search.error.message}
        </p>
      )}
    </main>
  )
}

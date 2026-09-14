import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import type { NumistaType, NumistaIssue } from '../../../shared/numista/types'
import { NumistaQuotaError } from '../../../shared/numista/errors'
import { getTypeWithIssues } from '../../lib/numista/proxyClient'
import { useSearchByKm } from './useSearchByKm'
import { KmSearchForm } from './KmSearchForm'
import { TypeResultList } from './TypeResultList'
import { IssuePicker } from './IssuePicker'
import { ItemForm, type ItemFormValues } from './ItemForm'
import { saveItem } from './saveItem'

export function AddCoinPage() {
  const navigate = useNavigate()
  const search = useSearchByKm()
  const [selected, setSelected] = useState<
    { type: NumistaType; issues: NumistaIssue[] } | null
  >(null)
  const [issueId, setIssueId] = useState<number | null>(null)

  const loadType = useMutation({
    mutationFn: (type: NumistaType) => getTypeWithIssues(type.id),
    onSuccess: (data) => {
      setSelected(data)
      setIssueId(null)
    },
  })

  const save = useMutation({
    mutationFn: (values: ItemFormValues) =>
      saveItem({
        numistaId: selected!.type.id,
        numistaIssueId: issueId,
        ...values,
      }),
    onSuccess: () => navigate('/'),
  })

  const error = search.error ?? loadType.error ?? save.error

  // Una búsqueda nueva abandona cualquier intento de cargar un tipo o de
  // guardar que quedara colgado de la búsqueda anterior: sus errores ya no
  // corresponden a lo que se está mostrando, así que se limpian antes de
  // buscar. `search.mutate` limpia `search.error` por su cuenta.
  function handleSearch(km: string) {
    loadType.reset()
    save.reset()
    search.mutate(km)
  }

  // Al salir de la moneda seleccionada (para elegir otra) se abandona tanto
  // el intento de carga del tipo como cualquier intento de guardado que
  // hubiera fallado: ninguno de los dos aplica ya a la vista de búsqueda a
  // la que se vuelve.
  function handleBackToSearch() {
    setSelected(null)
    loadType.reset()
    save.reset()
  }

  return (
    <main>
      <h1>Agregar moneda</h1>

      {!selected && (
        <>
          <KmSearchForm
            onSearch={handleSearch}
            isSearching={search.isPending}
          />
          {search.data && (
            <TypeResultList
              types={search.data.types}
              onSelect={(type) => loadType.mutate(type)}
            />
          )}
        </>
      )}

      {selected && (
        <>
          <h2>{selected.type.title}</h2>
          <p>{selected.type.issuer?.name}</p>
          <button type="button" onClick={handleBackToSearch}>
            Elegir otra moneda
          </button>
          <IssuePicker
            issues={selected.issues}
            selectedId={issueId}
            onSelect={setIssueId}
          />
          <ItemForm onSubmit={(v) => save.mutate(v)} isSaving={save.isPending} />
        </>
      )}

      {error && (
        <p role="alert">
          {error instanceof NumistaQuotaError
            ? 'Se agotó la cuota mensual de la API de Numista. Las monedas ya consultadas siguen disponibles; vuelve a intentarlo el próximo mes.'
            : error.message}
        </p>
      )}
    </main>
  )
}

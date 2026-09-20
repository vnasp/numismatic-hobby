import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NumistaType, NumistaIssue } from "../../../shared/numista/types";
import { NumistaQuotaError } from "../../../shared/numista/errors";
import { numistaTypeUrl } from "../../../shared/numista/urls";
import {
  getCachedIssuers,
  getTypeWithIssues,
} from "../../lib/numista/proxyClient";
import { BookIcon, ExternalIcon } from "../shell/icons";
import { findDuplicate } from "../collection/collectionData";
import { useCollection } from "../collection/useCollection";
import { useSearchByKm, type CatalogueChoice } from "./useSearchByKm";
import { KmSearchForm } from "./KmSearchForm";
import { TypeResultList } from "./TypeResultList";
import { TypeSummary } from "./TypeSummary";
import { IssuePicker } from "./IssuePicker";
import { ItemForm, type ItemFormValues } from "./ItemForm";
import { issueLabel } from "./typeFacts";
import { ConfirmStep } from "./ConfirmStep";
import { FlowBar } from "./FlowBar";
import { Stepper, type StepIndex } from "./Stepper";
import { saveItem } from "./saveItem";

const EMPTY_VALUES: ItemFormValues = {
  grade: null,
  conditionNotes: "",
  location: "",
  notes: "",
};

export function AddCoinPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = useSearchByKm();
  const issuers = useQuery({
    queryKey: ["issuers", "visible-v2"],
    queryFn: getCachedIssuers,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });

  // La colección ya suele estar en caché por la pantalla principal, así que
  // esto no agrega una consulta en la práctica: se usa para avisar del
  // duplicado antes de que la usuaria llene el formulario.
  const collection = useCollection();

  const [step, setStep] = useState<StepIndex>(0);
  const [selected, setSelected] = useState<{
    type: NumistaType;
    issues: NumistaIssue[];
  } | null>(null);
  const [issueId, setIssueId] = useState<number | null>(null);
  const [values, setValues] = useState<ItemFormValues>(EMPTY_VALUES);
  // Lo último que se buscó, para poder repetirlo en el otro catálogo.
  const [lastSearch, setLastSearch] = useState<{ km: string; issuer: string } | null>(null);

  // Cada búsqueda o salida hacia los resultados abre una "generación" nueva.
  // Una moneda que termine de cargar después pertenece a la anterior y se
  // descarta: si no, una respuesta lenta taparía los resultados recién pedidos.
  const generation = useRef(0);

  const loadType = useMutation({
    mutationFn: async (typeId: number) => {
      // Se anota antes de esperar: leerla a la vuelta daría siempre la actual.
      const startedIn = generation.current;
      return { data: await getTypeWithIssues(typeId), generation: startedIn };
    },
    onSuccess: ({ data, generation: startedIn }) => {
      if (startedIn !== generation.current) return;
      setSelected(data);
      setIssueId(null);
    },
  });

  const save = useMutation({
    mutationFn: (item: ItemFormValues) =>
      saveItem({
        numistaId: selected!.type.id,
        numistaIssueId: issueId,
        ...item,
      }),
    onSuccess: () => {
      // La colección (queryKey ['collection']) puede seguir cacheada de una
      // visita anterior a "/": se invalida para que la moneda recién
      // guardada aparezca sin depender de un refresco manual.
      queryClient.invalidateQueries({ queryKey: ["collection"] });
      navigate("/coleccion");
    },
  });

  // Se puede llegar desde "Buscar" con la moneda ya elegida ("/agregar?tipo=420"),
  // saltándose el paso de búsqueda por KM. El ref evita recargarla en cada
  // render: el objeto de la mutación cambia de identidad constantemente.
  const [params] = useSearchParams();
  const typeParam = params.get("tipo");
  const loadedParam = useRef<string | null>(null);

  useEffect(() => {
    if (!typeParam || loadedParam.current === typeParam) return;
    const typeId = Number(typeParam);
    if (!Number.isInteger(typeId) || typeId <= 0) return;
    loadedParam.current = typeParam;
    loadType.mutate(typeId);
  }, [typeParam, loadType]);

  const error = search.error ?? loadType.error ?? save.error;

  // Una búsqueda nueva abandona cualquier intento de cargar un tipo o de
  // guardar que quedara colgado de la búsqueda anterior: sus errores ya no
  // corresponden a lo que se está mostrando, así que se limpian antes de
  // buscar. `search.mutate` limpia `search.error` por su cuenta.
  //
  // También suelta la moneda elegida: los resultados sólo se muestran cuando
  // no hay ninguna, así que sin esto la búsqueda corregida nunca aparecería.
  function handleSearch(km: string, issuer: string, choice: CatalogueChoice = "ambos") {
    handleBackToSearch();
    setLastSearch({ km, issuer });
    search.mutate({ km, issuer, choice });
  }

  // Al salir de la moneda seleccionada (para elegir otra) se abandona tanto
  // el intento de carga del tipo como cualquier intento de guardado que
  // hubiera fallado: ninguno de los dos aplica ya a la vista de búsqueda a
  // la que se vuelve.
  function handleBackToSearch() {
    generation.current += 1;
    setSelected(null);
    setIssueId(null);
    setValues(EMPTY_VALUES);
    loadType.reset();
    save.reset();
  }

  /**
   * La flecha de la barra retrocede un tramo por vez: del paso 3 al 2, del 2
   * al 1, del 1 con moneda elegida a los resultados, y recién ahí sale a la
   * colección. Es el mismo camino que se hizo para llegar, al revés.
   */
  function handleBack() {
    if (step > 0) {
      // Salir hacia atrás de la confirmación abandona el intento de guardado:
      // su error pertenece a una pantalla que ya no se está mirando.
      if (step === 2) save.reset();
      setStep((current) => (current - 1) as StepIndex);
      return;
    }
    if (selected) {
      handleBackToSearch();
      return;
    }
    navigate("/coleccion");
  }

  const backLabel =
    step > 0 ? "Volver al paso anterior" : selected ? "Elegir otra moneda" : "Volver a la colección";

  const issue = selected?.issues.find((i) => i.id === issueId) ?? null;

  // El mismo tipo y la misma emisión ya registrados. El índice
  // `coins_items_sin_duplicados` es quien garantiza la regla; esto sólo evita
  // que la usuaria se entere recién al final, después de llenar el formulario.
  const duplicate = selected
    ? findDuplicate(collection.data ?? [], {
        numistaId: selected.type.id,
        numistaIssueId: issueId,
      })
    : null;

  return (
    <div className="app">
      <FlowBar
        title="Agregar moneda"
        onBack={handleBack}
        backLabel={backLabel}
        onClose={() => navigate("/")}
      />

      <main className="app__main stack">
        <Stepper current={step} />

        {step === 0 && (
          <>
            <div className="section-head section-head--stacked">
              <h2>Busca la moneda en el catálogo</h2>
              <p className="field__hint">
                Usa el número KM o Y# y, si lo sabes, selecciona el país.
              </p>
            </div>

            <KmSearchForm
              onSearch={handleSearch}
              isSearching={search.isPending}
              issuers={issuers.data}
            />

            {/* El mismo número existe en los dos catálogos para monedas
                distintas (Rusia: KM #141 es del siglo XVIII e Y #141 es
                moderna), así que al encontrar en KM se ofrece el otro. */}
            {search.data &&
              search.data.types.length > 0 &&
              search.data.choice === "ambos" &&
              search.data.usedCatalogue === "KM" &&
              lastSearch && (
                <p className="field__hint">
                  Estos resultados son del catálogo KM.{" "}
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() =>
                      handleSearch(lastSearch.km, lastSearch.issuer, "Y")
                    }
                  >
                    Buscar Y #{search.data.typedKm} en su lugar
                  </button>
                </p>
              )}

            {search.data &&
              search.data.types.length > 0 &&
              search.data.choice === "ambos" &&
              search.data.usedCatalogue === "Y" && (
                <p className="field__hint">
                  <strong>KM #{search.data.typedKm}</strong> no dio resultados,
                  así que se buscó en Yeoman: Numista referencia esta moneda
                  como <strong>Y #{search.data.usedKm}</strong>.
                </p>
              )}

            {search.data &&
              search.data.types.length > 0 &&
              search.data.usedCatalogue === "KM" &&
              search.data.usedKm !== search.data.typedKm && (
                <p className="field__hint">
                  <strong>KM #{search.data.typedKm}</strong> no dio resultados,
                  así que se buscó <strong>KM #{search.data.usedKm}</strong>: en
                  esta moneda Numista trata la variante como una emisión y no
                  como un tipo aparte. Elígela y abajo aparecerá la emisión{" "}
                  <strong>{search.data.typedKm}</strong>.
                </p>
              )}

            {search.data && !selected && (
              <>
                <div className="section-head">
                  <h2>Resultados</h2>
                  <p className="eyebrow">
                    {search.data.types.length === 1
                      ? "1 resultado"
                      : `${search.data.types.length} resultados`}
                  </p>
                </div>
                <p className="field__hint">
                  Selecciona la moneda que coincide con la tuya.
                </p>
                <TypeResultList
                  types={search.data.types}
                  onSelect={(type) => loadType.mutate(type.id)}
                  searchedIn={
                    search.data.choice === "ambos"
                      ? "ni en KM ni en Y#"
                      : `en el catálogo ${search.data.choice === "KM" ? "KM" : "Y#"}`
                  }
                />
              </>
            )}

            {selected && (
              <>
                <div className="card">
                  <TypeSummary type={selected.type} />
                </div>
                <div className="card">
                  <IssuePicker
                    issues={selected.issues}
                    selectedId={issueId}
                    onSelect={setIssueId}
                  />
                </div>
                {duplicate && (
                  <p className="alert alert--error" role="alert">
                    <strong>{duplicate.title}</strong>
                    {issue
                      ? ` (${issueLabel(issue)})`
                      : " sin emisión identificada"}{" "}
                    ya está en tu colección. Si tienes un segundo ejemplar de
                    la misma emisión, por ahora no se puede registrar por
                    separado; si es de otro año o ceca, elígela arriba.
                  </p>
                )}

                <button
                  type="button"
                  className="btn btn--primary btn--block"
                  onClick={() => setStep(1)}
                  disabled={Boolean(duplicate)}
                >
                  Continuar →
                </button>
              </>
            )}
          </>
        )}

        {step === 1 && selected && (
          <>
            <div className="section-head section-head--stacked">
              <h2>Describe tu ejemplar</h2>
              <p className="field__hint">
                Todo es opcional: puedes completarlo más adelante.
              </p>
            </div>
            <ItemForm
              initialValues={values}
              submitLabel="Continuar →"
              isSaving={false}
              onSubmit={(v) => {
                setValues(v);
                setStep(2);
              }}
            />
          </>
        )}

        {step === 2 && selected && (
          <ConfirmStep
            type={selected.type}
            issue={issue}
            values={values}
            isSaving={save.isPending}
            onSave={() => save.mutate(values)}
          />
        )}

        {error && (
          <p className="alert alert--error" role="alert">
            {error instanceof NumistaQuotaError
              ? "Se agotó la cuota mensual de la API de Numista. Las monedas ya consultadas siguen disponibles; vuelve a intentarlo el próximo mes."
              : error.message}
          </p>
        )}

        {selected && (
          <a
            className="flow-footer"
            href={numistaTypeUrl(selected.type)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <BookIcon size={18} />
            Ver ficha completa en Numista
            <ExternalIcon size={16} />
          </a>
        )}
      </main>
    </div>
  );
}

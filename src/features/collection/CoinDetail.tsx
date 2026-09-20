import { useEffect, useId, useRef, useState } from "react";
import { numistaTypeUrl } from "../../../shared/numista/urls";
import { formatReference } from "../../../shared/numista/references";
import { GRADES, gradeLabel, type GradeCode } from "../../lib/grades";
import { CloseIcon, ExternalIcon } from "../shell/icons";
import { Dropdown } from "../shell/Dropdown";
import type { CollectionEntry } from "./useCollection";
import { useSaveItem } from "./useSaveItem";

interface Props {
  entry: CollectionEntry;
  onClose: () => void;
}

const CURRENCIES = [
  { value: "CLP", label: "CLP" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
];

/** Decimales con coma, como corresponde en español. */
function formatNumber(value: number): string {
  return value.toLocaleString("es", { maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Ficha de una moneda de la colección.
 *
 * Reúne lo que no cabe en la tarjeta: el material (para saber con qué
 * limpiarla), el diámetro (para comprar cartones con la ventana correcta), el
 * enlace a Numista y la valoración anotada a mano.
 */
export function CoinDetail({ entry, onClose }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const save = useSaveItem();

  const [amount, setAmount] = useState(
    entry.value ? String(entry.value.amount) : "",
  );
  const [currency, setCurrency] = useState(entry.value?.currency ?? "CLP");
  const [grade, setGrade] = useState<GradeCode | "">(entry.grade ?? "");

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const facts: { label: string; value: string }[] = [];
  if (entry.issuerName) facts.push({ label: "País", value: entry.issuerName });
  if (entry.issueYear) {
    facts.push({ label: "Año", value: String(entry.issueYear) });
    // El año que lleva la moneda no siempre es del calendario gregoriano: una
    // israelí fechada 5745 es de 1985, y así hay que contarla.
    if (entry.gregorianYear && entry.gregorianYear !== entry.issueYear) {
      facts.push({
        label: "Año gregoriano",
        value: String(entry.gregorianYear),
      });
    }
  }
  // La ceca va aparte del año: el precio de Numista es por año y ceca.
  if (entry.mintLetter) facts.push({ label: "Ceca", value: entry.mintLetter });
  if (entry.reference) {
    facts.push({ label: "Catálogo", value: formatReference(entry.reference) });
  }
  if (entry.material) facts.push({ label: "Material", value: entry.material });
  if (entry.diameterMm) {
    facts.push({
      label: "Diámetro",
      value: `${formatNumber(entry.diameterMm)} mm`,
    });
  }
  if (entry.weightG)
    facts.push({ label: "Peso", value: `${formatNumber(entry.weightG)} g` });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = amount.trim().replace(",", ".");
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) return;
    save.mutate({
      id: entry.id,
      grade: grade === "" ? null : grade,
      amount: parsed,
      currency,
    });
  }

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <div
        className="dialog dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="detail__head">
          <h2 className="dialog__title" id={titleId}>
            {entry.title}
          </h2>
          <button
            type="button"
            className="icon-btn"
            aria-label="Cerrar la ficha"
            ref={closeRef}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>

        {entry.thumbnail && (
          <div className="detail__faces">
            <img src={entry.thumbnail} alt="" width={96} height={96} />
            {entry.thumbnailBack && (
              <img src={entry.thumbnailBack} alt="" width={96} height={96} />
            )}
          </div>
        )}

        {facts.length > 0 && (
          <dl className="detail__facts">
            {facts.map((fact) => (
              <div className="detail__fact" key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <form className="detail__value" onSubmit={handleSubmit}>
          <h3 className="detail__subtitle">Lo que puedes corregir</h3>

          <div className="field">
            <label className="field__label" htmlFor={`grado-${entry.id}`}>
              Estado de conservación
            </label>
            <Dropdown
              id={`grado-${entry.id}`}
              value={grade}
              onChange={(value) => setGrade(value as GradeCode | "")}
              options={[
                { value: "", label: "Sin especificar" },
                ...GRADES.map((g) => ({
                  value: g.code,
                  label: gradeLabel(g.code),
                })),
              ]}
            />
          </div>

          <div className="detail__value-row">
            <div className="field">
              <label className="field__label" htmlFor={`valor-${entry.id}`}>
                Valor estimado
              </label>
              <input
                className="input"
                id={`valor-${entry.id}`}
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Por ejemplo: 3500"
              />
            </div>

            <div className="field detail__currency">
              <label className="field__label" htmlFor={`moneda-${entry.id}`}>
                Moneda
              </label>
              <Dropdown
                id={`moneda-${entry.id}`}
                value={currency}
                onChange={setCurrency}
                options={CURRENCIES}
              />
            </div>
          </div>

          {save.error && (
            <p className="alert alert--error" role="alert">
              {(save.error as Error).message}
            </p>
          )}

          {entry.value?.at && !save.isSuccess && (
            <p className="field__hint">
              Anotada el {formatDate(entry.value.at)}
              {entry.value.source ? ` · ${entry.value.source}` : ""}
            </p>
          )}
          {save.isSuccess && <p className="field__hint">Cambios guardados.</p>}

          <div className="dialog__actions">
            <a
              className="link-btn detail__numista"
              href={numistaTypeUrl({ id: entry.numistaId })}
              target="_blank"
              rel="noreferrer"
            >
              Ver en Numista <ExternalIcon size={14} />
            </a>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={save.isPending}
            >
              {save.isPending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

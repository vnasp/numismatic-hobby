import { useState, type FormEvent } from "react";
import { CloseIcon, SearchIcon } from "../shell/icons";
import { IssuerCombobox } from "./IssuerCombobox";
import { Dropdown } from "../shell/Dropdown";
import type { IssuerOption } from "../../lib/numista/proxyClient";
import type { CatalogueChoice } from "./useSearchByKm";

interface Props {
  onSearch: (km: string, issuer: string, choice: CatalogueChoice) => void;
  isSearching: boolean;
  issuers?: IssuerOption[];
  /** Catálogo con el que llegar preseleccionado, al rebuscar desde un aviso. */
  choice?: CatalogueChoice;
}

const CHOICES: { value: CatalogueChoice; label: string }[] = [
  { value: "ambos", label: "KM y Y#" },
  { value: "KM", label: "Sólo KM" },
  { value: "Y", label: "Sólo Y#" },
];

export function KmSearchForm({ onSearch, isSearching, issuers = [], choice = "ambos" }: Props) {
  const [km, setKm] = useState("");
  const [issuer, setIssuer] = useState("");
  const [catalogue, setCatalogue] = useState<CatalogueChoice>(choice);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = km.trim();
    if (!trimmed) return;
    onSearch(trimmed, issuer.trim().toLowerCase(), catalogue);
  }

  return (
    <form className="form card" onSubmit={handleSubmit}>
      <div className="field-row">
        <div className="field">
          <label className="field__label" htmlFor="km">
            Número KM o Y#
          </label>
          <div className="input-clearable">
            <input
              className="input"
              id="km"
              type="text"
              inputMode="decimal"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              placeholder="Por ejemplo: 360.1"
            />
            {km && (
              <button
                type="button"
                className="input-clearable__clear"
                aria-label="Borrar el KM"
                onClick={() => setKm("")}
              >
                <CloseIcon size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="issuer">
            País / Emisor (opcional)
          </label>
          <IssuerCombobox issuers={issuers} value={issuer} onChange={setIssuer} />
        </div>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="catalogo">
          Catálogo
        </label>
        <Dropdown
          id="catalogo"
          value={catalogue}
          onChange={(value) => setCatalogue(value as CatalogueChoice)}
          options={CHOICES}
        />
        <p className="field__hint">
          Con los dos se busca primero en KM y, si no hay nada, en Y#. Fíjalo en
          uno cuando el mismo número exista en ambos y sean monedas distintas.
        </p>
      </div>

      <button type="submit" className="btn btn--primary btn--block" disabled={isSearching}>
        {!isSearching && <SearchIcon size={18} />}
        {isSearching ? "Buscando…" : "Buscar"}
      </button>
    </form>
  );
}

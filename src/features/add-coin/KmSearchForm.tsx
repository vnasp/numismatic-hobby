import { useMemo, useState, type FormEvent } from "react";
import type { IssuerOption } from "../../lib/numista/proxyClient";

interface Props {
  onSearch: (km: string, issuer: string) => void;
  isSearching: boolean;
  issuers?: IssuerOption[];
}

export function KmSearchForm({ onSearch, isSearching, issuers = [] }: Props) {
  const [km, setKm] = useState("");
  const [issuer, setIssuer] = useState("");
  const [issuerQuery, setIssuerQuery] = useState("");
  const [isIssuerOpen, setIsIssuerOpen] = useState(false);

  const filteredIssuers = useMemo(() => {
    const query = issuerQuery.trim().toLocaleLowerCase();
    if (!query) return issuers;
    return issuers.filter((item) =>
      item.issuer_name.toLocaleLowerCase().includes(query),
    );
  }, [issuerQuery, issuers]);

  const selectedIssuer = issuers.find((item) => item.issuer_code === issuer);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = km.trim();
    if (!trimmed) return;
    onSearch(trimmed, issuer.trim().toLowerCase());
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="km">Número KM</label>
      <input
        id="km"
        type="text"
        inputMode="decimal"
        value={km}
        onChange={(e) => setKm(e.target.value)}
        placeholder="Por ejemplo: 360.1"
      />
      <label id="issuer-label">Emisor (opcional)</label>
      <div className="issuer-dropdown">
        <button
          type="button"
          className="issuer-dropdown-trigger"
          aria-haspopup="listbox"
          aria-expanded={isIssuerOpen}
          aria-labelledby="issuer-label issuer-value"
          id="issuer-value"
          onClick={() => setIsIssuerOpen((open) => !open)}
        >
          {selectedIssuer?.issuer_name ?? "Todos los emisores"}
        </button>
        {isIssuerOpen && (
          <div className="issuer-dropdown-menu">
            <input
              aria-label="Buscar emisor"
              type="search"
              value={issuerQuery}
              onChange={(e) => setIssuerQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setIsIssuerOpen(false);
              }}
              placeholder="Buscar emisor..."
              autoFocus
            />
            <div role="listbox" aria-label="Emisores">
              <button
                type="button"
                role="option"
                aria-selected={!issuer}
                onClick={() => {
                  setIssuer("");
                  setIssuerQuery("");
                  setIsIssuerOpen(false);
                }}
              >
                Todos los emisores
              </button>
              {filteredIssuers.map((item) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={item.issuer_code === issuer}
                  key={item.issuer_code}
                  onClick={() => {
                    setIssuer(item.issuer_code);
                    setIssuerQuery("");
                    setIsIssuerOpen(false);
                  }}
                >
                  {item.issuer_name}
                </button>
              ))}
              {filteredIssuers.length === 0 && (
                <p>No se encontraron emisores.</p>
              )}
            </div>
          </div>
        )}
      </div>
      <button type="submit" disabled={isSearching}>
        {isSearching ? "Buscando…" : "Buscar"}
      </button>
    </form>
  );
}

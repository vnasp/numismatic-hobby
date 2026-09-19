import { useMutation } from "@tanstack/react-query";
import type { NumistaSearchResult } from "../../../shared/numista/types";
import {
  kmSearchCandidates,
  SEARCH_CATALOGUES,
  type CatalogueCode,
} from "../../../shared/numista/references";
import { searchByKm } from "../../lib/numista/proxyClient";

/** Qué catálogos probar: los dos, o uno solo cuando la usuaria lo fija. */
export type CatalogueChoice = CatalogueCode | "ambos";

export interface KmSearchResult extends NumistaSearchResult {
  /** Lo que se escribió, ya sin espacios. */
  typedKm: string;
  /** El número que finalmente devolvió estos resultados. */
  usedKm: string;
  /** El catálogo en que se encontró: KM, o Y# si en KM no había nada. */
  usedCatalogue: CatalogueCode;
  /** Lo que se pidió buscar: sirve para no explicar un salto que se eligió. */
  choice: CatalogueChoice;
}

/**
 * Busca por número de catálogo probando los intentos en orden: primero en KM
 * el número tal cual se escribió y, sólo si no hubo resultados, el número base
 * sin el sufijo con punto. Si KM no encuentra nada, repite lo mismo en Yeoman
 * (Y#), porque hay países —Venezuela, por ejemplo— que Numista sólo
 * referencia por Y# aunque el número sea el mismo.
 *
 * Cada reintento gasta una llamada de cuota, pero únicamente cuando el
 * anterior vino vacío: es la misma cuota que se gastaría buscando a mano cada
 * variante, que es lo que tendría que hacer la usuaria si no.
 */
export function useSearchByKm() {
  return useMutation({
    mutationFn: async ({
      km,
      issuer,
      choice = "ambos",
    }: {
      km: string;
      issuer: string;
      choice?: CatalogueChoice;
    }): Promise<KmSearchResult> => {
      const candidates = kmSearchCandidates(km);
      const typedKm = candidates[0];
      const catalogues =
        choice === "ambos" ? (Object.keys(SEARCH_CATALOGUES) as CatalogueCode[]) : [choice];

      let last: KmSearchResult | null = null;
      for (const catalogue of catalogues) {
        for (const candidate of candidates) {
          const result = await searchByKm(candidate, issuer, catalogue);
          last = { ...result, typedKm, usedKm: candidate, usedCatalogue: catalogue, choice };
          if (result.types.length > 0) return last;
        }
      }

      // Ningún intento encontró nada: se devuelve el último para que la
      // pantalla muestre el estado vacío.
      return last as KmSearchResult;
    },
  });
}

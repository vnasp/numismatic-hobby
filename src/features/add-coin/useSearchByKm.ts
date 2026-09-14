import { useMutation } from "@tanstack/react-query";
import { searchByKm } from "../../lib/numista/proxyClient";

export function useSearchByKm() {
  return useMutation({
    mutationFn: ({ km, issuer }: { km: string; issuer: string }) =>
      searchByKm(km, issuer),
  });
}

import { browseIssuer, searchByKm, searchCatalogue } from "./proxyClient";
import {
  NumistaError,
  NumistaQuotaError,
  NumistaNotFoundError,
} from "../../../shared/numista/errors";

const invoke = vi.fn();

vi.mock("../supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

beforeEach(() => invoke.mockReset());

/**
 * Construye la forma real que devuelve supabase.functions.invoke cuando la
 * Edge Function responde con un status HTTP no-2xx: `data` es siempre null,
 * y el cuerpo JSON solo es recuperable vía `error.context.json()` (context
 * es el Response original, tal como lo arma FunctionsHttpError en
 * @supabase/functions-js).
 */
function httpErrorResult(status: number, body: unknown) {
  return {
    data: null,
    error: {
      name: "FunctionsHttpError",
      message: "Edge Function returned a non-2xx status code",
      context: new Response(JSON.stringify(body), { status }),
    },
  };
}

test("invoca el proxy con la operación de búsqueda por KM y su issuer", async () => {
  invoke.mockResolvedValue({ data: { count: 0, types: [] }, error: null });

  await searchByKm("360.1", " CHILE ");

  expect(invoke).toHaveBeenCalledWith("numista-proxy", {
    body: { op: "searchByKm", km: "360.1", issuer: "chile" },
  });
});

test("envía el catálogo sólo cuando no es KM", async () => {
  invoke.mockResolvedValue({ data: { count: 0, types: [] }, error: null });

  await searchByKm("42", "venezuela", "Y");

  expect(invoke).toHaveBeenCalledWith("numista-proxy", {
    body: { op: "searchByKm", km: "42", issuer: "venezuela", catalogue: "Y" },
  });
});

test("devuelve los resultados del catálogo", async () => {
  invoke.mockResolvedValue({
    data: { count: 1, types: [{ id: 420, title: "5 Cents - Victoria" }] },
    error: null,
  });

  const result = await searchByKm("2");

  expect(result.count).toBe(1);
  expect(result.types[0].title).toBe("5 Cents - Victoria");
});

test("envía year como string aunque se reciba un número", async () => {
  invoke.mockResolvedValue({ data: { count: 0, types: [] }, error: null });

  // El Edge Function descarta `year` si no llega como string, así que un
  // año numérico se perdería en silencio.
  await searchCatalogue({ q: "peso", year: 1960 });

  expect(invoke).toHaveBeenCalledWith("numista-proxy", {
    body: { op: "search", q: "peso", year: "1960" },
  });
});

test("recorre un emisor de a 100 y ordenado por número de catálogo", async () => {
  invoke.mockResolvedValue({ data: { count: 0, types: [] }, error: null });

  await browseIssuer({ issuer: "Chili", date: "1900-2026", page: 2 });

  expect(invoke).toHaveBeenCalledWith("numista-proxy", {
    body: {
      op: "search",
      issuer: "chili",
      date: "1900-2026",
      catalogue: "KM",
      page: 2,
      count: 100,
      order: "reference",
    },
  });
});

test("deja pasar el tipo de objeto, para dejar fuera patrones y fichas", async () => {
  invoke.mockResolvedValue({ data: { count: 0, types: [] }, error: null });

  await browseIssuer({ issuer: "chili", date: "1900-2026", objectType: 1 });

  expect(invoke).toHaveBeenCalledWith(
    "numista-proxy",
    expect.objectContaining({
      body: expect.objectContaining({ objectType: 1 }),
    }),
  );
});

test("traduce el 429 del proxy a un error de cuota", async () => {
  invoke.mockResolvedValue(
    httpErrorResult(429, {
      name: "NumistaQuotaError",
      error: "Se agotó la cuota mensual de la API de Numista.",
    }),
  );

  await expect(searchByKm("2")).rejects.toBeInstanceOf(NumistaQuotaError);
});

test("traduce el 404 del proxy a un error de no encontrado", async () => {
  invoke.mockResolvedValue(
    httpErrorResult(404, {
      name: "NumistaNotFoundError",
      error: "No se encontró en el catálogo de Numista.",
    }),
  );

  await expect(searchByKm("999")).rejects.toBeInstanceOf(NumistaNotFoundError);
});

test("un 400 de validación sin `name` cae en el error genérico", async () => {
  invoke.mockResolvedValue(
    httpErrorResult(400, { error: "Falta el parámetro km." }),
  );

  const rejection = searchByKm("");
  await expect(rejection).rejects.toBeInstanceOf(NumistaError);
  await expect(rejection).rejects.not.toBeInstanceOf(NumistaQuotaError);
});

test("un fallo de red (FunctionsFetchError) cae en el error genérico sin lanzar de forma inesperada", async () => {
  invoke.mockResolvedValue({
    data: null,
    error: {
      name: "FunctionsFetchError",
      message: "Failed to send a request to the Edge Function",
      context: new TypeError("network error"),
    },
  });

  await expect(searchByKm("2")).rejects.toBeInstanceOf(NumistaError);
});

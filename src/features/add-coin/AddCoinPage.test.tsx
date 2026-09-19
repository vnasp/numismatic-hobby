import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AddCoinPage } from "./AddCoinPage";
import { elegirEnDesplegable } from "../../testing/dropdown";

const searchByKm = vi.fn();
const getTypeWithIssues = vi.fn();
const ensureIssuersCached = vi.fn();
const getCachedIssuers = vi.fn();

vi.mock("../../lib/numista/proxyClient", () => ({
  searchByKm: (...args: unknown[]) => searchByKm(...args),
  getTypeWithIssues: (...args: unknown[]) => getTypeWithIssues(...args),
  ensureIssuersCached: (...args: unknown[]) => ensureIssuersCached(...args),
  getCachedIssuers: (...args: unknown[]) => getCachedIssuers(...args),
}));

const saveItem = vi.fn();

vi.mock("./saveItem", () => ({
  saveItem: (...args: unknown[]) => saveItem(...args),
}));

// La colección se consulta para detectar duplicados. Se aísla para no tocar
// el cliente real de Supabase y para poder poblarla en cada caso.
let enColeccion: { numistaId: number; numistaIssueId: number | null; title: string }[] = [];

vi.mock("../collection/useCollection", () => ({
  useCollection: () => ({ data: enColeccion, isLoading: false, error: null }),
}));

beforeEach(() => {
  searchByKm.mockReset();
  getTypeWithIssues.mockReset();
  ensureIssuersCached.mockReset();
  getCachedIssuers.mockReset();
  saveItem.mockReset();
  ensureIssuersCached.mockResolvedValue(undefined);
  getCachedIssuers.mockResolvedValue([]);
  enColeccion = [];
});

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AddCoinPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test("no arrastra el error de un guardado fallido a una búsqueda nueva", async () => {
  const user = userEvent.setup();

  searchByKm.mockResolvedValueOnce({
    count: 1,
    types: [
      {
        id: 1,
        title: "Moneda A",
        min_year: 2000,
        obverse_thumbnail: "https://ejemplo.cl/a.jpg",
      },
    ],
  });
  getTypeWithIssues.mockResolvedValueOnce({
    type: { id: 1, title: "Moneda A" },
    issues: [],
  });
  saveItem.mockRejectedValueOnce(new Error("Fallo simulado al guardar"));

  renderPage();

  await user.type(screen.getByLabelText(/número km/i), "111");
  await user.click(screen.getByRole("button", { name: /^buscar$/i }));

  const typeButton = await screen.findByRole("button", { name: /Moneda A/i });
  await user.click(typeButton);

  await user.click(await screen.findByRole("button", { name: /continuar/i }));
  await user.click(screen.getByRole("button", { name: /continuar/i }));
  await user.click(screen.getByRole("button", { name: /guardar moneda/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    /fallo simulado al guardar/i,
  );

  // Abandona la moneda fallida y deshace el camino hasta la búsqueda: del
  // paso 3 al 2, del 2 al 1, y del 1 de vuelta a los resultados.
  await user.click(screen.getByRole("button", { name: /volver al paso anterior/i }));
  await user.click(screen.getByRole("button", { name: /volver al paso anterior/i }));
  await user.click(screen.getByRole("button", { name: /elegir otra moneda/i }));

  searchByKm.mockResolvedValueOnce({
    count: 1,
    types: [
      {
        id: 2,
        title: "Moneda B",
        min_year: 2001,
        obverse_thumbnail: "https://ejemplo.cl/b.jpg",
      },
    ],
  });
  await user.type(screen.getByLabelText(/número km/i), "222");
  await user.click(screen.getByRole("button", { name: /^buscar$/i }));

  await screen.findByRole("button", { name: /Moneda B/i });

  // El error del guardado anterior ya no debe mostrarse: pertenece a una
  // moneda que la usuaria abandonó, no a esta búsqueda nueva.
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("no arrastra el error de una carga de tipo fallida a una búsqueda nueva", async () => {
  const user = userEvent.setup();

  searchByKm.mockResolvedValueOnce({
    count: 1,
    types: [
      {
        id: 1,
        title: "Moneda A",
        min_year: 2000,
        obverse_thumbnail: "https://ejemplo.cl/a.jpg",
      },
    ],
  });
  getTypeWithIssues.mockRejectedValueOnce(
    new Error("Fallo simulado al cargar el tipo"),
  );

  renderPage();

  await user.type(screen.getByLabelText(/número km/i), "111");
  await user.click(screen.getByRole("button", { name: /^buscar$/i }));

  const typeButton = await screen.findByRole("button", { name: /Moneda A/i });
  await user.click(typeButton);

  expect(await screen.findByRole("alert")).toHaveTextContent(
    /fallo simulado al cargar el tipo/i,
  );

  // Sin pasar por "Elegir otra moneda": se busca directamente de nuevo.
  searchByKm.mockResolvedValueOnce({
    count: 1,
    types: [
      {
        id: 2,
        title: "Moneda B",
        min_year: 2001,
        obverse_thumbnail: "https://ejemplo.cl/b.jpg",
      },
    ],
  });
  await user.clear(screen.getByLabelText(/número km/i));
  await user.type(screen.getByLabelText(/número km/i), "222");
  await user.click(screen.getByRole("button", { name: /^buscar$/i }));

  await screen.findByRole("button", { name: /Moneda B/i });

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

// --- Flujo por pasos ------------------------------------------------------

const TIPO = {
  id: 420,
  title: "½ Centésimo",
  issuer: { code: "chile", name: "Chile" },
  min_year: 1962,
  max_year: 1963,
  composition: { text: "Cobre-níquel" },
  size: 18,
  weight: 2.5,
  references: [{ catalogue: { id: 3, code: "KM" }, number: "192" }],
};

const EMISIONES = [
  { id: 900, year: 1962, mint_letter: "So", mintage: 3750000 },
  { id: 901, year: 1963, mint_letter: "So", mintage: 8100000 },
];

async function buscarYElegir(user: ReturnType<typeof userEvent.setup>) {
  searchByKm.mockResolvedValueOnce({ count: 1, types: [{ id: 420, title: "½ Centésimo" }] });
  getTypeWithIssues.mockResolvedValueOnce({ type: TIPO, issues: EMISIONES });

  renderPage();
  await user.type(screen.getByLabelText(/número km/i), "192");
  await user.click(screen.getByRole("button", { name: /^buscar$/i }));
  await user.click(await screen.findByRole("button", { name: /½ Centésimo/i }));
}

test("arranca en el paso 1 y avanza por los tres pasos", async () => {
  const user = userEvent.setup();
  await buscarYElegir(user);

  const pasos = screen.getByRole("list", { name: /progreso/i });
  expect(pasos).toHaveTextContent(/Buscar \(paso actual\)/);

  await user.click(await screen.findByRole("button", { name: /continuar/i }));
  expect(pasos).toHaveTextContent(/Detalles \(paso actual\)/);

  await user.click(screen.getByRole("button", { name: /continuar/i }));
  expect(pasos).toHaveTextContent(/Confirmar \(paso actual\)/);
  expect(screen.getByRole("button", { name: /guardar moneda/i })).toBeInTheDocument();
});

test("muestra los datos físicos de la moneda una vez cargado el tipo", async () => {
  const user = userEvent.setup();
  await buscarYElegir(user);

  expect(await screen.findByText("Cobre-níquel")).toBeInTheDocument();
  expect(screen.getByText("18 mm")).toBeInTheDocument();
  expect(screen.getByText("2,5 g")).toBeInTheDocument();
  expect(screen.getByText("1962 – 1963")).toBeInTheDocument();
});

test("la confirmación resume la emisión elegida y lo que se escribió", async () => {
  const user = userEvent.setup();
  await buscarYElegir(user);

  await user.click(await screen.findByRole("radio", { name: /1963 · Ceca So/i }));
  await user.click(screen.getByRole("button", { name: /continuar/i }));

  await user.type(screen.getByLabelText(/ubicación/i), "Álbum 2");
  await user.click(screen.getByRole("button", { name: /continuar/i }));

  expect(screen.getByText(/1963 · Ceca So · Tirada 8\.100\.000/)).toBeInTheDocument();
  expect(screen.getByText("Álbum 2")).toBeInTheDocument();
});

test("sin elegir emisión, la confirmación lo dice en vez de callarlo", async () => {
  const user = userEvent.setup();
  await buscarYElegir(user);

  await user.click(await screen.findByRole("button", { name: /continuar/i }));
  await user.click(screen.getByRole("button", { name: /continuar/i }));

  expect(screen.getByText("Sin determinar")).toBeInTheDocument();
});

test("volver atrás desde la confirmación conserva lo que ya se había escrito", async () => {
  const user = userEvent.setup();
  await buscarYElegir(user);

  await user.click(await screen.findByRole("button", { name: /continuar/i }));
  await user.type(screen.getByLabelText(/ubicación/i), "Cápsula 7");
  await user.click(screen.getByRole("button", { name: /continuar/i }));

  await user.click(screen.getByRole("button", { name: /volver al paso anterior/i }));

  expect(screen.getByLabelText(/ubicación/i)).toHaveValue("Cápsula 7");
});

test("la ayuda para identificar la emisión está plegada y se puede abrir", async () => {
  const user = userEvent.setup();
  await buscarYElegir(user);

  const ayuda = await screen.findByRole("button", { name: /cómo saberlo/i });
  expect(ayuda).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByText(/santiago de chile/i)).not.toBeInTheDocument();

  await user.click(ayuda);

  expect(ayuda).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByText(/santiago de chile/i)).toBeInTheDocument();
});

test("enlaza a la ficha completa en Numista una vez elegida la moneda", async () => {
  const user = userEvent.setup();
  await buscarYElegir(user);

  expect(
    await screen.findByRole("link", { name: /ver ficha completa en numista/i }),
  ).toHaveAttribute("href", "https://es.numista.com/420");
});

// --- Duplicados -----------------------------------------------------------

test("impide agregar una moneda que ya está en la colección con la misma emisión", async () => {
  const user = userEvent.setup();
  enColeccion = [{ numistaId: 420, numistaIssueId: 900, title: "½ Centésimo" }];

  await buscarYElegir(user);
  await user.click(await screen.findByRole("radio", { name: /1962 · Ceca So/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    /ya está en tu colección/i,
  );
  expect(screen.getByRole("button", { name: /continuar/i })).toBeDisabled();
});

test("permite agregar otra emisión del mismo tipo, que es otra moneda", async () => {
  const user = userEvent.setup();
  enColeccion = [{ numistaId: 420, numistaIssueId: 900, title: "½ Centésimo" }];

  await buscarYElegir(user);
  // 1963 es una emisión distinta de la que ya está registrada (1962).
  await user.click(await screen.findByRole("radio", { name: /1963 · Ceca So/i }));

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /continuar/i })).toBeEnabled();
});

test("dos ejemplares sin emisión identificada del mismo tipo cuentan como el mismo", async () => {
  const user = userEvent.setup();
  enColeccion = [{ numistaId: 420, numistaIssueId: null, title: "½ Centésimo" }];

  await buscarYElegir(user);

  // "No estoy segura de la emisión" es la opción activa por omisión.
  expect(await screen.findByRole("alert")).toHaveTextContent(
    /sin emisión identificada.*ya está en tu colección/is,
  );
  expect(screen.getByRole("button", { name: /continuar/i })).toBeDisabled();
});

test("una moneda que no está en la colección se puede agregar sin aviso", async () => {
  const user = userEvent.setup();
  enColeccion = [{ numistaId: 999, numistaIssueId: 900, title: "Otra moneda" }];

  await buscarYElegir(user);

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /continuar/i })).toBeEnabled();
});

// --- Variantes con punto: dónde las registra Numista ----------------------

test("una variante registrada en el tipo se encuentra tal cual se escribió", async () => {
  const user = userEvent.setup();
  // El 1 Colón de Costa Rica (N#7666) se referencia como KM# 186.2-186.4: el
  // número con sufijo es el único que lo alcanza.
  searchByKm.mockResolvedValueOnce({
    count: 1,
    types: [{ id: 7666, title: "1 Colón" }],
  });

  renderPage();
  await user.type(screen.getByLabelText(/número km/i), "186.2");
  await user.click(screen.getByRole("button", { name: /^buscar$/i }));

  await screen.findByRole("button", { name: /1 Colón/i });
  expect(searchByKm).toHaveBeenCalledTimes(1);
  expect(searchByKm).toHaveBeenCalledWith("186.2", "", "KM");
  // No se recortó nada, así que no hay nada que explicar.
  expect(screen.queryByText(/no dio resultados/i)).not.toBeInTheDocument();
});

test("una variante registrada en la emisión se encuentra reintentando con la base", async () => {
  const user = userEvent.setup();
  // El 10 Pesos chileno es al revés: el tipo es el 216 y el .1 vive en la
  // emisión, así que el número tal cual no devuelve nada.
  searchByKm.mockResolvedValueOnce({ count: 0, types: [] });
  searchByKm.mockResolvedValueOnce({
    count: 1,
    types: [{ id: 216, title: "10 Pesos" }],
  });

  renderPage();
  await user.type(screen.getByLabelText(/número km/i), "216.1");
  await user.click(screen.getByRole("button", { name: /^buscar$/i }));

  await screen.findByRole("button", { name: /10 Pesos/i });
  expect(searchByKm).toHaveBeenNthCalledWith(1, "216.1", "", "KM");
  expect(searchByKm).toHaveBeenNthCalledWith(2, "216", "", "KM");
  expect(screen.getByText(/no dio resultados/i)).toBeInTheDocument();
});

test("sin sufijo con punto sólo prueba el número en KM y en Y#", async () => {
  const user = userEvent.setup();
  searchByKm.mockResolvedValue({ count: 0, types: [] });

  renderPage();
  await user.type(screen.getByLabelText(/número km/i), "999");
  await user.click(screen.getByRole("button", { name: /^buscar$/i }));

  expect(await screen.findByText(/no se encontraron monedas/i)).toBeInTheDocument();
  expect(searchByKm).toHaveBeenCalledTimes(2);
  expect(searchByKm).toHaveBeenNthCalledWith(1, "999", "", "KM");
  expect(searchByKm).toHaveBeenNthCalledWith(2, "999", "", "Y");
});

test("agotados los candidatos muestra el estado vacío, sin quedarse buscando", async () => {
  const user = userEvent.setup();
  searchByKm.mockResolvedValue({ count: 0, types: [] });

  renderPage();
  await user.type(screen.getByLabelText(/número km/i), "186.9");
  await user.click(screen.getByRole("button", { name: /^buscar$/i }));

  expect(await screen.findByText(/no se encontraron monedas/i)).toBeInTheDocument();
  // Número tal cual y base, primero en KM y después en Y#.
  expect(searchByKm).toHaveBeenCalledTimes(4);
  // Sin resultados no hay reintento que explicar.
  expect(screen.queryByText(/no dio resultados/i)).not.toBeInTheDocument();
});

// --- Monedas referenciadas sólo por Yeoman --------------------------------

test("cuando KM no encuentra nada, busca el mismo número en Y#", async () => {
  const user = userEvent.setup();
  // Venezuela: Numista referencia sus monedas por Y# y no por KM.
  searchByKm.mockResolvedValueOnce({ count: 0, types: [] });
  searchByKm.mockResolvedValueOnce({
    count: 1,
    types: [{ id: 27246, title: "¼ Real" }],
  });

  renderPage();
  await user.type(screen.getByLabelText(/número km/i), "1");
  await user.click(screen.getByRole("button", { name: /^buscar$/i }));

  await screen.findByRole("button", { name: /¼ Real/i });
  expect(searchByKm).toHaveBeenNthCalledWith(1, "1", "", "KM");
  expect(searchByKm).toHaveBeenNthCalledWith(2, "1", "", "Y");
  expect(screen.getByText(/se buscó en yeoman/i)).toBeInTheDocument();
});

test("no busca en Y# si KM ya encontró la moneda", async () => {
  const user = userEvent.setup();
  searchByKm.mockResolvedValueOnce({
    count: 1,
    types: [{ id: 420, title: "½ Centésimo" }],
  });

  renderPage();
  await user.type(screen.getByLabelText(/número km/i), "2");
  await user.click(screen.getByRole("button", { name: /^buscar$/i }));

  await screen.findByRole("button", { name: /½ Centésimo/i });
  expect(searchByKm).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/yeoman/i)).not.toBeInTheDocument();
});

// --- Buscar de nuevo -------------------------------------------------------

test("una búsqueda nueva con una moneda ya elegida muestra los resultados nuevos", async () => {
  const user = userEvent.setup();
  searchByKm.mockResolvedValueOnce({ count: 1, types: [{ id: 420, title: "½ Centésimo" }] });
  getTypeWithIssues.mockResolvedValueOnce({
    type: { id: 420, title: "½ Centésimo" },
    issues: [],
  });
  searchByKm.mockResolvedValueOnce({ count: 1, types: [{ id: 216, title: "10 Pesos" }] });

  renderPage();
  const km = screen.getByLabelText(/número km/i);
  await user.type(km, "2");
  await user.click(screen.getByRole("button", { name: /^buscar$/i }));
  await user.click(await screen.findByRole("button", { name: /½ Centésimo/i }));
  await screen.findByRole("heading", { name: "½ Centésimo" });

  // Me equivoqué de número: corrijo y vuelvo a buscar.
  await user.clear(km);
  await user.type(km, "216");
  await user.click(screen.getByRole("button", { name: /^buscar$/i }));

  expect(await screen.findByRole("button", { name: /10 Pesos/i })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "½ Centésimo" })).not.toBeInTheDocument();
});

test("la carga de una moneda anterior no pisa una búsqueda nueva", async () => {
  const user = userEvent.setup();
  searchByKm.mockResolvedValueOnce({ count: 1, types: [{ id: 420, title: "½ Centésimo" }] });
  let resolveType!: (value: unknown) => void;
  getTypeWithIssues.mockReturnValueOnce(new Promise((resolve) => (resolveType = resolve)));
  searchByKm.mockResolvedValueOnce({ count: 1, types: [{ id: 216, title: "10 Pesos" }] });

  renderPage();
  const km = screen.getByLabelText(/número km/i);
  await user.type(km, "2");
  await user.click(screen.getByRole("button", { name: /^buscar$/i }));
  await user.click(await screen.findByRole("button", { name: /½ Centésimo/i }));

  // Antes de que termine de cargar, busco otra cosa.
  await user.clear(km);
  await user.type(km, "216");
  await user.click(screen.getByRole("button", { name: /^buscar$/i }));
  await screen.findByRole("button", { name: /10 Pesos/i });

  resolveType({ type: { id: 420, title: "½ Centésimo" }, issues: [] });

  // La respuesta tardía se descarta: siguen los resultados de la búsqueda nueva.
  expect(await screen.findByRole("button", { name: /10 Pesos/i })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "½ Centésimo" })).not.toBeInTheDocument();
});

// --- Elegir el catálogo ----------------------------------------------------

test("con el catálogo fijado en Y# no se busca en KM", async () => {
  const user = userEvent.setup();
  // Rusia: KM #141 es una moneda del siglo XVIII y el Y #141 es otra, así que
  // buscar en los dos devolvería la que no es.
  searchByKm.mockResolvedValueOnce({ count: 1, types: [{ id: 5, title: "15 Kopeks" }] });

  renderPage();
  await user.type(screen.getByLabelText(/número km/i), "141");
  await elegirEnDesplegable(user, /catálogo/i, /sólo y#/i);
  await user.click(screen.getByRole("button", { name: /^buscar$/i }));

  await screen.findByRole("button", { name: /15 Kopeks/i });
  expect(searchByKm).toHaveBeenCalledTimes(1);
  expect(searchByKm).toHaveBeenCalledWith("141", "", "Y");
});

test("ofrece repetir en Y# cuando los resultados vinieron de KM", async () => {
  const user = userEvent.setup();
  searchByKm.mockResolvedValueOnce({ count: 1, types: [{ id: 1, title: "5 Kopeks 1763" }] });
  searchByKm.mockResolvedValueOnce({ count: 1, types: [{ id: 5, title: "15 Kopeks" }] });

  renderPage();
  await user.type(screen.getByLabelText(/número km/i), "141");
  await user.click(screen.getByRole("button", { name: /^buscar$/i }));
  await screen.findByRole("button", { name: /5 Kopeks 1763/i });

  await user.click(screen.getByRole("button", { name: /buscar y #141/i }));

  expect(await screen.findByRole("button", { name: /15 Kopeks/i })).toBeInTheDocument();
  expect(searchByKm).toHaveBeenNthCalledWith(2, "141", "", "Y");
  // Ya se está viendo el catálogo Y#: no hay nada más que ofrecer.
  expect(screen.queryByRole("button", { name: /buscar y #141/i })).not.toBeInTheDocument();
});

test("el vacío dice en qué catálogo se buscó cuando se fijó uno", async () => {
  const user = userEvent.setup();
  searchByKm.mockResolvedValueOnce({ count: 0, types: [] });

  renderPage();
  await user.type(screen.getByLabelText(/número km/i), "141");
  await elegirEnDesplegable(user, /catálogo/i, /sólo y#/i);
  await user.click(screen.getByRole("button", { name: /^buscar$/i }));

  expect(await screen.findByText(/en el catálogo y#/i)).toBeInTheDocument();
});

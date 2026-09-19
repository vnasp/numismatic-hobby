import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KmSearchForm } from "./KmSearchForm";
import { elegirEnDesplegable } from "../../testing/dropdown";

const EMISORES = [
  { issuer_code: "chile", issuer_name: "Chile" },
  { issuer_code: "costa-rica", issuer_name: "Costa Rica" },
  { issuer_code: "canada", issuer_name: "Canadá" },
];

function renderForm(props: Partial<Parameters<typeof KmSearchForm>[0]> = {}) {
  return render(
    <KmSearchForm
      onSearch={vi.fn()}
      isSearching={false}
      issuers={EMISORES}
      {...props}
    />,
  );
}

test("entrega el KM buscado sin espacios sobrantes", async () => {
  const onSearch = vi.fn();
  const user = userEvent.setup();
  renderForm({ onSearch });

  await user.type(screen.getByLabelText(/número km/i), "  360.1 ");
  // Se escribe el país en el propio campo: sin desplegar ni buscar aparte.
  await user.type(screen.getByLabelText(/país \/ emisor/i), "chil");
  await user.click(await screen.findByRole("option", { name: "Chile" }));
  await user.click(screen.getByRole("button", { name: /buscar/i }));

  expect(onSearch).toHaveBeenCalledWith("360.1", "chile", "ambos");
});

test("filtra los emisores mientras se escribe, ignorando acentos", async () => {
  const user = userEvent.setup();
  renderForm();

  await user.type(screen.getByLabelText(/país \/ emisor/i), "canada");

  expect(await screen.findByRole("option", { name: "Canadá" })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "Chile" })).not.toBeInTheDocument();
});

test("el campo muestra el país elegido cuando no se está escribiendo", async () => {
  const user = userEvent.setup();
  renderForm();

  const campo = screen.getByLabelText(/país \/ emisor/i);
  await user.type(campo, "costa");
  await user.click(await screen.findByRole("option", { name: "Costa Rica" }));

  expect(campo).toHaveValue("Costa Rica");
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
});

test("se puede elegir con el teclado sin sacar el foco del campo", async () => {
  const onSearch = vi.fn();
  const user = userEvent.setup();
  renderForm({ onSearch });

  await user.type(screen.getByLabelText(/número km/i), "186.2");
  const campo = screen.getByLabelText(/país \/ emisor/i);
  await user.type(campo, "costa");
  await user.keyboard("{Enter}");

  expect(campo).toHaveValue("Costa Rica");

  await user.click(screen.getByRole("button", { name: /buscar/i }));
  expect(onSearch).toHaveBeenCalledWith("186.2", "costa-rica", "ambos");
});

test("Enter sobre la lista elige el país en vez de lanzar la búsqueda", async () => {
  const onSearch = vi.fn();
  const user = userEvent.setup();
  renderForm({ onSearch });

  await user.type(screen.getByLabelText(/número km/i), "186.2");
  await user.type(screen.getByLabelText(/país \/ emisor/i), "chil");
  await user.keyboard("{Enter}");

  expect(onSearch).not.toHaveBeenCalled();
});

test("Escape cierra la lista y descarta lo tecleado a medias", async () => {
  const user = userEvent.setup();
  renderForm();

  const campo = screen.getByLabelText(/país \/ emisor/i);
  await user.type(campo, "chil");
  expect(screen.getByRole("listbox")).toBeInTheDocument();

  await user.keyboard("{Escape}");

  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  expect(campo).toHaveValue("");
});

test("avisa cuando ningún emisor coincide", async () => {
  const user = userEvent.setup();
  renderForm();

  await user.type(screen.getByLabelText(/país \/ emisor/i), "zzz");

  expect(await screen.findByText(/no se encontraron emisores/i)).toBeInTheDocument();
});

test("no busca con el campo vacío", async () => {
  const onSearch = vi.fn();
  const user = userEvent.setup();
  render(<KmSearchForm onSearch={onSearch} isSearching={false} />);

  await user.click(screen.getByRole("button", { name: /buscar/i }));

  expect(onSearch).not.toHaveBeenCalled();
});

test("deshabilita el botón mientras busca", () => {
  render(<KmSearchForm onSearch={vi.fn()} isSearching={true} />);
  expect(screen.getByRole("button", { name: /buscando/i })).toBeDisabled();
});

test("permite fijar el catálogo en Y#", async () => {
  const onSearch = vi.fn();
  const user = userEvent.setup();
  renderForm({ onSearch });

  await user.type(screen.getByLabelText(/número km/i), "141");
  await elegirEnDesplegable(user, /catálogo/i, /sólo y#/i);
  await user.click(screen.getByRole("button", { name: /buscar/i }));

  expect(onSearch).toHaveBeenCalledWith("141", "", "Y");
});

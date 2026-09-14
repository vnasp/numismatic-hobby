import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KmSearchForm } from "./KmSearchForm";

test("entrega el KM buscado sin espacios sobrantes", async () => {
  const onSearch = vi.fn();
  const user = userEvent.setup();
  render(
    <KmSearchForm
      onSearch={onSearch}
      isSearching={false}
      issuers={[{ issuer_code: "chile", issuer_name: "Chile" }]}
    />,
  );

  await user.type(screen.getByLabelText(/número km/i), "  360.1 ");
  await user.click(screen.getByRole("button", { name: /todos los emisores/i }));
  await user.type(
    screen.getByRole("searchbox", { name: /buscar emisor/i }),
    "chil",
  );
  await user.click(screen.getByRole("option", { name: "Chile" }));
  await user.click(screen.getByRole("button", { name: /buscar/i }));

  expect(onSearch).toHaveBeenCalledWith("360.1", "chile");
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

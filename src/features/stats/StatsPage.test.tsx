import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { StatsPage, StatsShell } from './StatsPage'
import type { CollectionEntry } from '../collection/useCollection'

let entries: CollectionEntry[] = []
/** La sesión de cada prueba: null es quien llega a la vitrina sin llave. */
let session: { user: { id: string } } | null = { user: { id: 'user-1' } }

// Las dos consultas devuelven lo mismo: lo que se prueba acá es qué hace la
// pantalla con la sesión, no de qué tabla salieron las monedas.
vi.mock('../collection/useCollection', () => ({
  useCollection: () => ({ data: entries, isLoading: false, error: null }),
}))

vi.mock('../public/usePublicCollection', () => ({
  usePublicCollection: () => ({ data: entries, isLoading: false, error: null }),
}))

vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ session, loading: false, signOut: vi.fn() }),
}))

beforeEach(() => {
  session = { user: { id: 'user-1' } }
})

function entry(overrides: Partial<CollectionEntry> = {}): CollectionEntry {
  return {
    id: crypto.randomUUID(),
    numistaId: 420,
    numistaIssueId: null,
    grade: 'vf',
    title: '1 Peso',
    issuerCode: 'chili',
    issuerName: 'Chile',
    continent: 'América',
    reference: null,
    issueYear: 1955,
    mintLetter: null,
    thumbnail: null,
    thumbnailBack: null,
    material: null,
    diameterMm: null,
    weightG: null,
    value: null,
    isFavorite: false,
    ...overrides,
    // Por defecto el año gregoriano sigue al de la moneda: sólo los casos que
    // prueban otros calendarios los separan a propósito.
    gregorianYear:
      overrides.gregorianYear ??
      ('issueYear' in overrides ? overrides.issueYear! : 1955),
  }
}

/** Deja la URL del router a la vista, que es donde vive el filtro. */
function LocationProbe() {
  const location = useLocation()
  return <output data-testid="url">{location.search}</output>
}

function renderStats() {
  return render(
    <MemoryRouter>
      <StatsPage />
      <LocationProbe />
    </MemoryRouter>,
  )
}

/** La misma pantalla vista sin sesión. */
function renderVitrina() {
  session = null
  return renderStats()
}

test('suma el valor de la colección y cuenta las que faltan por valorar', () => {
  entries = [
    entry({ value: { amount: 3500, currency: 'CLP', source: null, at: null } }),
    entry({ value: { amount: 1200, currency: 'CLP', source: null, at: null } }),
    entry({ value: null }),
  ]
  renderStats()

  // El español no agrupa los millares de cuatro dígitos: 4700, no 4.700.
  expect(screen.getByText('4700 CLP')).toBeInTheDocument()
  expect(screen.getByText('2 monedas valoradas')).toBeInTheDocument()
  expect(screen.getByText('Sin valorar')).toBeInTheDocument()
})

test('muestra cada divisa por separado, sin inventar un tipo de cambio', () => {
  entries = [
    entry({ value: { amount: 3500, currency: 'CLP', source: null, at: null } }),
    entry({ value: { amount: 8, currency: 'EUR', source: null, at: null } }),
  ]
  renderStats()

  expect(screen.getByText(/CLP/)).toBeInTheDocument()
  expect(screen.getByText(/EUR/)).toBeInTheDocument()
})

test('sin ninguna valoración no muestra la sección', () => {
  entries = [entry({ value: null })]
  renderStats()

  expect(screen.queryByRole('heading', { name: 'Valoración' })).not.toBeInTheDocument()
})

test('resume la colección por material', () => {
  entries = [
    entry({ material: 'Cuproníquel (75% Copper, 25% Nickel)' }),
    entry({ material: 'Cuproníquel' }),
    entry({ material: 'Aluminio' }),
  ]
  renderStats()

  const seccion = screen.getByRole('heading', { name: 'Por material' }).closest('section')!
  expect(seccion).toHaveTextContent('Cuproníquel')
  expect(seccion).toHaveTextContent('Aluminio')
})

test('resume la colección por diámetro, agrupada por tamaño de cartón', () => {
  entries = [entry({ diameterMm: 19.4 }), entry({ diameterMm: 20 }), entry({ diameterMm: 25.5 })]
  renderStats()

  const seccion = screen.getByRole('heading', { name: 'Por tamaño de cartón' }).closest('section')!
  expect(seccion).toHaveTextContent('20 mm')
  expect(seccion).toHaveTextContent('27,5 mm')
})

test('sin ningún diámetro registrado no muestra la sección', () => {
  entries = [entry({ diameterMm: null })]
  renderStats()

  // Lo único que quedaría por mostrar es "Sin diámetro", que no informa nada.
  expect(
    screen.queryByRole('heading', { name: 'Por tamaño de cartón' }),
  ).not.toBeInTheDocument()
})

test('cruza dos gráficos: al elegir un continente el resto se recalcula', async () => {
  const user = userEvent.setup()
  entries = [
    entry({ continent: 'América', issuerName: 'Chile', diameterMm: 24 }),
    entry({ continent: 'América', issuerName: 'Perú', diameterMm: 30 }),
    entry({ continent: 'Europa', issuerName: 'España', diameterMm: 24 }),
  ]
  renderStats()

  await user.click(screen.getByRole('button', { name: /^América/ }))

  // La cifra de arriba pasa a decir cuántas de las tres quedaron.
  const cifra = screen.getByText('de 3 monedas').closest('.figure')!
  expect(cifra).toHaveTextContent('2')
})

test('el filtro puesto queda en la URL, para poder compartir el cruce', async () => {
  const user = userEvent.setup()
  entries = [
    entry({ continent: 'América', diameterMm: 24 }),
    entry({ continent: 'Europa', diameterMm: 24 }),
  ]
  renderStats()

  await user.click(screen.getByRole('button', { name: /^América/ }))

  expect(screen.getByTestId('url')).toHaveTextContent('continente=Am')
})

test('se puede quitar un filtro desde su ficha', async () => {
  const user = userEvent.setup()
  entries = [
    entry({ continent: 'América', diameterMm: 24 }),
    entry({ continent: 'Europa', diameterMm: 24 }),
  ]
  renderStats()

  await user.click(screen.getByRole('button', { name: /^América/ }))
  await user.click(screen.getByRole('button', { name: 'Quitar el filtro América' }))

  expect(screen.queryByRole('button', { name: 'Limpiar todo' })).not.toBeInTheDocument()
})

test('ofrece descargar la colección completa cuando no hay filtros', () => {
  entries = [entry(), entry()]
  renderStats()

  expect(
    screen.getByRole('button', { name: 'Exportar la colección a CSV (2)' }),
  ).toBeInTheDocument()
})

test('con un cruce armado, la descarga dice que baja sólo ese cruce', async () => {
  const user = userEvent.setup()
  entries = [
    entry({ continent: 'América', diameterMm: 24 }),
    entry({ continent: 'Europa', diameterMm: 24 }),
  ]
  renderStats()

  await user.click(screen.getByRole('button', { name: /^América/ }))

  expect(screen.getByRole('button', { name: 'Exportar estas 1 a CSV' })).toBeInTheDocument()
})

test('cada gráfico deja sus números también en una tabla', () => {
  entries = [entry({ continent: 'América' }), entry({ continent: 'Europa' })]
  renderStats()

  // Un gráfico es una forma de leer, no la única.
  expect(screen.getAllByText('Ver los números').length).toBeGreaterThan(0)
})

/* -------------------------------------------------------------------------
   Sin sesión: la misma pantalla, con menos que contar
   ------------------------------------------------------------------------- */

test('sin sesión no muestra la valoración ni la descarga', () => {
  entries = [entry({ value: { amount: 3500, currency: 'CLP', source: null, at: null } })]
  renderVitrina()

  expect(screen.queryByRole('heading', { name: 'Valoración' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /CSV/ })).not.toBeInTheDocument()
  expect(screen.queryByText('Favoritas')).not.toBeInTheDocument()
})

test('sin sesión no cuenta el material, los tamaños de cartón ni la conservación', () => {
  // Puestos juntos dicen cuánto vale el conjunto, cómo está guardado y con
  // qué hay que limpiarlo: eso es del inventario, no del catálogo.
  entries = [
    entry({ diameterMm: 24, grade: 'vf', material: 'Bronce' }),
    entry({ diameterMm: 30, grade: 'unc', material: 'Plata' }),
  ]
  renderVitrina()

  expect(screen.queryByRole('heading', { name: 'Por material' })).not.toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Por tamaño de cartón' })).not.toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Por conservación' })).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Filtrar por material')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Filtrar por tamaño de cartón')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Filtrar por conservación')).not.toBeInTheDocument()
})

test('sin sesión sí muestra el catálogo: continente, país y década', () => {
  entries = [
    entry({ continent: 'América', issuerName: 'Chile', gregorianYear: 1920 }),
    entry({ continent: 'Europa', issuerName: 'España', gregorianYear: 1990 }),
  ]
  renderVitrina()

  expect(screen.getByRole('heading', { name: 'Por continente' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Por país' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Por década' })).toBeInTheDocument()
})

test('sin sesión también se puede cruzar lo que sí se muestra', async () => {
  const user = userEvent.setup()
  entries = [
    entry({ continent: 'América', issuerName: 'Chile' }),
    entry({ continent: 'América', issuerName: 'Perú' }),
    entry({ continent: 'Europa', issuerName: 'España' }),
  ]
  renderVitrina()

  await user.click(screen.getByRole('button', { name: /^América/ }))

  expect(screen.getByText('de 3 monedas').closest('.figure')).toHaveTextContent('2')
})

test('el encabezado cambia con la sesión', () => {
  entries = [entry()]
  const { unmount } = renderStats()
  expect(screen.getByRole('heading', { name: 'Estadísticas', level: 1 })).toBeInTheDocument()
  unmount()

  renderVitrina()
  expect(screen.getByRole('heading', { name: 'La colección en números' })).toBeInTheDocument()
})

/* -------------------------------------------------------------------------
   El armazón de /stats: la barra que corresponde a cada quien
   ------------------------------------------------------------------------- */

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/stats']}>
      <Routes>
        <Route element={<StatsShell />}>
          <Route path="/stats" element={<StatsPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

test('con sesión, /stats lleva la barra de cuatro secciones y el botón de agregar', () => {
  entries = [entry()]
  renderShell()

  const barra = screen.getByRole('navigation', { name: 'Secciones' })
  expect(barra).toHaveTextContent('Países')
  expect(screen.getByRole('link', { name: /agregar moneda/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Estadísticas' })).toHaveClass('tabbar__tab--active')
})

test('sin sesión, /stats lleva la barra de la vitrina: dos secciones y sin agregar', () => {
  entries = [entry()]
  session = null
  renderShell()

  const barra = screen.getByRole('navigation', { name: 'Secciones' })
  expect(barra).toHaveTextContent('Colección')
  expect(barra).toHaveTextContent('Estadísticas')
  expect(barra).not.toHaveTextContent('Países')
  expect(screen.queryByRole('link', { name: /agregar moneda/i })).not.toBeInTheDocument()
})

test('la colección de la vitrina apunta a la raíz, no a la ruta privada', () => {
  entries = [entry()]
  session = null
  renderShell()

  expect(screen.getByRole('link', { name: 'Colección' })).toHaveAttribute('href', '/')
})

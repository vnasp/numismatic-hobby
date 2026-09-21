import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './features/auth/AuthProvider'
import { RequireAuth } from './features/auth/RequireAuth'
import { LoginPage } from './features/auth/LoginPage'
import { AppShell } from './features/shell/AppShell'
import { CollectionPage } from './features/collection/CollectionPage'
import { CountriesPage } from './features/countries/CountriesPage'
import { MetaPage } from './features/metas/MetaPage'
import { CatalogSearchPage } from './features/catalog/CatalogSearchPage'
import { StatsPage, StatsShell } from './features/stats/StatsPage'
import { AddCoinPage } from './features/add-coin/AddCoinPage'
import { PublicCollectionPage } from './features/public/PublicCollectionPage'
import { PublicShell } from './features/public/PublicShell'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* La vitrina abierta: sin sesión y en modo lectura. Vive en la
                raíz, que es lo que corresponde mostrarle a quien llega al
                dominio pelado y es también el enlace que se comparte. La
                parte privada entra por /login. */}
            <Route element={<PublicShell />}>
              <Route path="/" element={<PublicCollectionPage />} />
            </Route>

            {/* /stats es una sola ruta para las dos mitades: con sesión
                muestra la colección completa, sin ella la vitrina. El
                armazón —y con él la barra de pestañas— lo elige la sesión. */}
            <Route element={<StatsShell />}>
              <Route path="/stats" element={<StatsPage />} />
            </Route>

            {/* Las demás secciones con sesión comparten la barra de
                pestañas; Estadísticas vive arriba, en /stats. */}
            <Route
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route path="/coleccion" element={<CollectionPage />} />
              <Route path="/paises" element={<CountriesPage />} />
              <Route path="/buscar" element={<CatalogSearchPage />} />
              <Route path="/metas/:slug" element={<MetaPage />} />
            </Route>

            {/* Agregar queda fuera del armazón con pestañas: es un flujo con
                principio y fin, no una sección para navegar. */}
            <Route
              path="/agregar"
              element={
                <RequireAuth>
                  <AddCoinPage />
                </RequireAuth>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

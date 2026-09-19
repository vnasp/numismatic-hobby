import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './features/auth/AuthProvider'
import { RequireAuth } from './features/auth/RequireAuth'
import { LoginPage } from './features/auth/LoginPage'
import { AppShell } from './features/shell/AppShell'
import { CollectionPage } from './features/collection/CollectionPage'
import { CountriesPage } from './features/countries/CountriesPage'
import { CatalogSearchPage } from './features/catalog/CatalogSearchPage'
import { StatsPage } from './features/stats/StatsPage'
import { AddCoinPage } from './features/add-coin/AddCoinPage'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Las cuatro secciones comparten la barra de pestañas. */}
            <Route
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route path="/" element={<CollectionPage />} />
              <Route path="/paises" element={<CountriesPage />} />
              <Route path="/buscar" element={<CatalogSearchPage />} />
              <Route path="/estadisticas" element={<StatsPage />} />
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

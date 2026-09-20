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
import { PublicCollectionPage } from './features/public/PublicCollectionPage'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* La vitrina abierta: sin sesión y en modo lectura. Vive en la
                raíz porque es lo que corresponde mostrarle a quien llega al
                dominio pelado, y también en /vnasp, que es el enlace que se
                comparte. La parte privada entra por /login. */}
            <Route path="/" element={<PublicCollectionPage />} />
            <Route path="/vnasp" element={<PublicCollectionPage />} />

            {/* Las cuatro secciones comparten la barra de pestañas. */}
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

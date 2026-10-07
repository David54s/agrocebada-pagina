import { HashRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { DataProvider } from './data/DataContext'
import { ModoProvider } from './data/ModoContext'
import Acerca from './pages/Acerca'
import Mapa from './pages/Mapa'
import Modelo from './pages/Modelo'
import NoEncontrado from './pages/NoEncontrado'
import Parcela from './pages/Parcela'
import Resumen from './pages/Resumen'
import Simulador from './pages/Simulador'

// HashRouter: funciona en cualquier hosting estático sin configurar redirecciones.
export default function App() {
  return (
    <ModoProvider>
      <DataProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Resumen />} />
              <Route path="mapa" element={<Mapa />} />
              <Route path="parcela/:id" element={<Parcela />} />
              <Route path="simulador" element={<Simulador />} />
              <Route path="modelo" element={<Modelo />} />
              <Route path="acerca" element={<Acerca />} />
              <Route path="*" element={<NoEncontrado />} />
            </Route>
          </Routes>
        </HashRouter>
      </DataProvider>
    </ModoProvider>
  )
}

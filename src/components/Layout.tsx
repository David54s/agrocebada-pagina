import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useDatos } from '../data/DataContext'
import { useModo } from '../data/ModoContext'
import BuscadorId from './BuscadorId'
import { Segmentado } from './ui'

const NAV = [
  { to: '/', texto: 'Resumen' },
  { to: '/mapa', texto: 'Mapa' },
  { to: '/simulador', texto: 'Simulador' },
  { to: '/modelo', texto: 'Modelo' },
  { to: '/acerca', texto: 'Acerca de' },
]

export default function Layout() {
  const { modo, setModo } = useModo()
  const { modelo } = useDatos()
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:p-2">
        Saltar al contenido
      </a>
      {modelo.es_mock && (
        <div className="bg-[var(--warning)] px-4 py-1.5 text-center text-xs font-medium text-black">
          Datos de demostración — se reemplazarán por los resultados del modelo real.
        </div>
      )}
      <header className="sticky top-0 z-[1000] border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
          <NavLink to="/" className="flex items-center gap-2 font-semibold">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-7" />
            <span>
              CebadaVision <span className="font-normal text-ink-2">· Reto AgroCebada FIRA 2026</span>
            </span>
          </NavLink>
          <nav aria-label="Principal" className="order-3 -mx-4 w-full overflow-x-auto px-4 md:order-none md:mx-0 md:w-auto md:px-0">
            <ul className="flex gap-1">
              {NAV.map((n) => (
                <li key={n.to}>
                  <NavLink
                    to={n.to}
                    end={n.to === '/'}
                    className={({ isActive }) =>
                      `block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${
                        isActive ? 'bg-accent-soft font-medium text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                      }`
                    }
                  >
                    {n.texto}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative hidden xl:block">
              <BuscadorId compacto />
            </div>
            <Segmentado
              etiqueta="Modo de vista"
              valor={modo}
              onChange={setModo}
              opciones={[
                { valor: 'productor', texto: 'Productor' },
                { valor: 'analista', texto: 'Analista' },
              ]}
            />
          </div>
        </div>
      </header>
      <main id="contenido" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-line py-4 text-center text-xs text-muted">
        Reto AgroCebada FIRA 2026 · Modelo {modelo.nombre} v{modelo.version} · Datos al {modelo.generado}
      </footer>
    </div>
  )
}

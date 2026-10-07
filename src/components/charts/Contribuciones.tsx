import { useDatos } from '../../data/DataContext'
import { useModo } from '../../data/ModoContext'
import type { Contribucion } from '../../model/surrogate'
import { conUnidad, signo } from '../../lib/format'

/**
 * Barras divergentes: cuánto suma (azul) o resta (rojo) cada variable al rendimiento,
 * comparado con una parcela promedio. Diverging pair azul ↔ rojo de la paleta.
 */
export default function Contribuciones({ items, limite = 7 }: { items: Contribucion[]; limite?: number }) {
  const { variables } = useDatos()
  const { modo } = useModo()
  const orden = [...items].sort((a, b) => Math.abs(b.aporte) - Math.abs(a.aporte)).slice(0, limite)
  const tope = Math.max(...orden.map((c) => Math.abs(c.aporte)), 0.01)

  if (modo === 'productor') {
    const suman = orden.filter((c) => c.aporte > 0.03).slice(0, 2)
    const restan = orden.filter((c) => c.aporte < -0.03).slice(0, 2)
    const nombre = (c: Contribucion) => variables.get(c.nombre)?.etiqueta ?? c.nombre
    return (
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg bg-surface-2 p-3">
          <div className="font-medium">
            <span aria-hidden className="text-[var(--pos)]">▲</span> Lo que más ayuda
          </div>
          <p className="mt-1 text-ink-2">
            {suman.length ? suman.map(nombre).join(' y ') : 'Ninguna variable destaca por encima del promedio.'}
          </p>
        </div>
        <div className="rounded-lg bg-surface-2 p-3">
          <div className="font-medium">
            <span aria-hidden className="text-[var(--neg)]">▼</span> Lo que más resta
          </div>
          <p className="mt-1 text-ink-2">
            {restan.length ? restan.map(nombre).join(' y ') : 'Ninguna variable está claramente por debajo del promedio.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ul className="space-y-1.5" aria-label="Aporte de cada variable a la predicción">
        {orden.map((c) => {
          const v = variables.get(c.nombre)
          // Máx. 38 % de cada lado para que la etiqueta quepa fuera de la barra.
          const pct = (Math.abs(c.aporte) / tope) * 38
          const positivo = c.aporte >= 0
          return (
            <li key={c.nombre} className="grid grid-cols-[minmax(7rem,10rem)_1fr] items-center gap-3 text-sm">
              <span className="min-w-0">
                <span className="block truncate text-ink">{v?.etiqueta ?? c.nombre}</span>
                <span className="tabular block text-xs text-muted">{conUnidad(c.valor, v?.unidad ?? '')}</span>
              </span>
              <span className="relative h-6" title={`${signo(c.aporte)} t/ha`}>
                <span className="absolute inset-y-0 left-1/2 w-px bg-[var(--axis)]" />
                <span
                  className="absolute top-1.5 h-3"
                  style={{
                    background: positivo ? 'var(--pos)' : 'var(--neg)',
                    width: `${pct}%`,
                    left: positivo ? '50%' : `${50 - pct}%`,
                    borderRadius: positivo ? '0 4px 4px 0' : '4px 0 0 4px',
                  }}
                />
                <span
                  className="tabular absolute top-0.5 text-xs font-medium text-ink"
                  style={positivo ? { left: `calc(${50 + pct}% + 4px)` } : { right: `calc(${50 + pct}% + 4px)` }}
                >
                  {signo(c.aporte)}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>◀ resta t/ha</span>
        <span>vs. parcela promedio</span>
        <span>suma t/ha ▶</span>
      </div>
    </div>
  )
}

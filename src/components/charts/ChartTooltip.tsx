import type { ReactNode } from 'react'

export interface FilaTooltip {
  color: string
  nombre: string
  valor: string
}

/** Tooltip compartido: valor fuerte, nombre secundario, clave de línea con el color de la serie. */
export function CajaTooltip({ titulo, filas, pie }: { titulo?: ReactNode; filas: FilaTooltip[]; pie?: ReactNode }) {
  return (
    <div className="min-w-36 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      {titulo && <div className="mb-1 text-ink-2">{titulo}</div>}
      <ul className="space-y-0.5">
        {filas.map((f) => (
          <li key={f.nombre} className="flex items-center gap-2">
            <span aria-hidden className="h-0.5 w-3 rounded" style={{ background: f.color }} />
            <span className="tabular text-sm font-semibold text-ink">{f.valor}</span>
            <span className="text-ink-2">{f.nombre}</span>
          </li>
        ))}
      </ul>
      {pie && <div className="mt-1 text-muted">{pie}</div>}
    </div>
  )
}

export const ejeProps = {
  stroke: 'var(--axis)',
  tick: { fill: 'var(--muted)', fontSize: 12 },
  tickLine: false,
} as const

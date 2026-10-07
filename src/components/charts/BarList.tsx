import type { ReactNode } from 'react'

export interface BarItem {
  clave: string
  etiqueta: ReactNode
  valor: number
  texto: string
  color?: string
  /** Texto extra para el tooltip/lector de pantalla. */
  detalle?: string
}

/**
 * Barras horizontales en HTML: una serie, un color, valor en la punta.
 * El valor siempre está visible, así que el tooltip solo complementa.
 */
export default function BarList({
  items,
  max,
  color = 'var(--series-1)',
  anchoEtiqueta = '9rem',
}: {
  items: BarItem[]
  max?: number
  color?: string
  anchoEtiqueta?: string
}) {
  const tope = max ?? Math.max(...items.map((i) => i.valor), 0)
  return (
    <ul className="space-y-2">
      {items.map((i) => {
        const pct = tope > 0 ? (i.valor / tope) * 100 : 0
        return (
          <li
            key={i.clave}
            className="group grid items-center gap-3 rounded-md text-sm hover:bg-surface-2"
            style={{ gridTemplateColumns: `${anchoEtiqueta} 1fr` }}
            title={i.detalle}
          >
            <span className="truncate text-ink-2">{i.etiqueta}</span>
            <span className="flex items-center gap-2">
              <span className="relative h-3.5 flex-1">
                <span
                  className="absolute inset-y-0 left-0 rounded-r-[4px] transition-[filter] group-hover:brightness-110"
                  style={{ width: `${pct}%`, background: i.color ?? color, minWidth: i.valor > 0 ? 2 : 0 }}
                />
              </span>
              <span className="tabular w-16 shrink-0 text-right font-medium text-ink">{i.texto}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

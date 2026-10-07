import type { ReactNode } from 'react'
import type { Estado, Modelo } from '../data/schema'
import { COLOR_ESTADO, NIVEL_INFO, nivel } from '../lib/colors'

export function Card({
  titulo,
  subtitulo,
  accion,
  children,
  className = '',
}: {
  titulo?: ReactNode
  subtitulo?: ReactNode
  accion?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-4 sm:p-5 ${className}`}>
      {(titulo || accion) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            {titulo && <h2 className="text-base font-semibold">{titulo}</h2>}
            {subtitulo && <p className="mt-0.5 text-sm text-ink-2">{subtitulo}</p>}
          </div>
          {accion}
        </header>
      )}
      {children}
    </section>
  )
}

/** Stat tile: etiqueta · valor · detalle opcional. */
export function Stat({ etiqueta, valor, detalle }: { etiqueta: string; valor: ReactNode; detalle?: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-sm text-ink-2">{etiqueta}</div>
      <div className="mt-1 text-2xl font-semibold">{valor}</div>
      {detalle && <div className="mt-1 text-xs text-muted">{detalle}</div>}
    </div>
  )
}

export function PuntoEstado({ estado }: { estado: Estado }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-block size-2.5 rounded-full"
        style={{ background: COLOR_ESTADO[estado] }}
      />
      {estado}
    </span>
  )
}

export function Insignia({ children, tono = 'neutro' }: { children: ReactNode; tono?: 'neutro' | 'acento' }) {
  const cls = tono === 'acento' ? 'bg-accent-soft text-ink' : 'bg-surface-2 text-ink-2'
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>
}

/** Semáforo: color de estatus + icono + texto (nunca solo color). */
export function Semaforo({
  valor,
  umbrales,
  conConsejo = false,
  compacto = false,
}: {
  valor: number
  umbrales: Modelo['umbrales']
  conConsejo?: boolean
  compacto?: boolean
}) {
  const n = nivel(valor, umbrales)
  const info = NIVEL_INFO[n]
  if (compacto)
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span aria-hidden style={{ color: info.color }}>
          {info.icono}
        </span>
        {n[0].toUpperCase() + n.slice(1)}
      </span>
    )
  return (
    <div>
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1 text-sm font-medium">
        <span aria-hidden style={{ color: info.color }}>
          {info.icono}
        </span>
        {info.etiqueta}
      </span>
      {conConsejo && <p className="mt-2 text-sm text-ink-2">{info.consejo}</p>}
    </div>
  )
}

export function Segmentado<T extends string>({
  opciones,
  valor,
  onChange,
  etiqueta,
}: {
  opciones: { valor: T; texto: string }[]
  valor: T
  onChange: (v: T) => void
  etiqueta: string
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          onClick={() => onChange(o.valor)}
          className={`rounded-md px-3 py-1 text-sm transition-colors ${
            valor === o.valor ? 'bg-surface font-medium text-ink shadow-sm' : 'text-ink-2 hover:text-ink'
          }`}
        >
          {o.texto}
        </button>
      ))}
    </div>
  )
}

export const selectCls =
  'rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink focus-visible:outline-2'
export const botonCls =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink hover:opacity-90 disabled:opacity-50'
export const botonSecCls =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-2'

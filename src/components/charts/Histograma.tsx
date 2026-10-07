import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Modelo } from '../../data/schema'
import { num } from '../../lib/format'
import { CajaTooltip, ejeProps } from './ChartTooltip'

/** Distribución del rendimiento en clases de 0.5 t/ha, con los umbrales del semáforo marcados. */
export default function Histograma({ valores, umbrales }: { valores: number[]; umbrales: Modelo['umbrales'] }) {
  const ancho = 0.5
  const lo = Math.floor(Math.min(...valores) / ancho) * ancho
  const hi = Math.ceil(Math.max(...valores) / ancho) * ancho
  const clases = Array.from({ length: Math.max(1, Math.round((hi - lo) / ancho)) }, (_, i) => {
    const desde = lo + i * ancho
    return {
      centro: desde + ancho / 2,
      desde,
      hasta: desde + ancho,
      n: valores.filter((v) => v >= desde && (v < desde + ancho || (i === Math.round((hi - lo) / ancho) - 1 && v === hi))).length,
    }
  })

  return (
    <div className="h-56">
      <ResponsiveContainer>
        <BarChart data={clases} margin={{ top: 16, right: 8, bottom: 0, left: -20 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis
            dataKey="centro"
            type="number"
            domain={[lo, hi]}
            ticks={clases.map((c) => c.desde).concat(hi)}
            tickFormatter={(v: number) => num(v, 1)}
            {...ejeProps}
          />
          <YAxis allowDecimals={false} {...ejeProps} axisLine={false} />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const c = payload[0].payload as (typeof clases)[number]
              return (
                <CajaTooltip
                  titulo={`${num(c.desde, 1)} – ${num(c.hasta, 1)} t/ha`}
                  filas={[{ color: 'var(--series-1)', nombre: 'parcelas', valor: String(c.n) }]}
                />
              )
            }}
          />
          <ReferenceLine x={umbrales.bajo} stroke="var(--ink-2)" label={{ value: 'bajo', position: 'top', fill: 'var(--ink-2)', fontSize: 11 }} />
          <ReferenceLine x={umbrales.alto} stroke="var(--ink-2)" label={{ value: 'alto', position: 'top', fill: 'var(--ink-2)', fontSize: 11 }} />
          <Bar dataKey="n" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

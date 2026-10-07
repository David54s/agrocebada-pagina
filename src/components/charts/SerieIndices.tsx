import { useMemo, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Observacion } from '../../data/schema'
import { fechaCorta, num } from '../../lib/format'
import { CajaTooltip, ejeProps } from './ChartTooltip'

const COLORES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)']

type Fila = { fecha: string; nubosidad: number; fuente: string } & Record<string, number | string | undefined>

/** Serie temporal de índices de vegetación de una parcela (una sola escala, un solo eje). */
export default function SerieIndices({ obs }: { obs: Observacion[] }) {
  const [maxNubes, setMaxNubes] = useState(30)

  const indices = useMemo(() => [...new Set(obs.map((o) => o.indice))].slice(0, 3), [obs])
  const filas = useMemo(() => {
    const porFecha = new Map<string, Fila>()
    for (const o of obs) {
      if (o.nubosidad > maxNubes || !indices.includes(o.indice)) continue
      const f = porFecha.get(o.fecha) ?? { fecha: o.fecha, nubosidad: o.nubosidad, fuente: o.fuente }
      f[o.indice] = o.valor
      porFecha.set(o.fecha, f)
    }
    return [...porFecha.values()].sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [obs, maxNubes, indices])
  const descartadas = new Set(obs.filter((o) => o.nubosidad > maxNubes).map((o) => o.fecha)).size

  if (!obs.length) return <p className="text-sm text-ink-2">Esta parcela no tiene serie temporal disponible.</p>

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-3 text-sm text-ink-2">
        <label className="flex items-center gap-2">
          Nubosidad máxima
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={maxNubes}
            onChange={(e) => setMaxNubes(Number(e.target.value))}
            aria-valuetext={`${maxNubes} %`}
          />
          <span className="tabular w-10 text-ink">{maxNubes} %</span>
        </label>
        <span className="text-xs text-muted">
          {descartadas} fechas ocultas por nubes · las nubes bajan artificialmente los índices
        </span>
      </div>
      <div className="h-64">
        <ResponsiveContainer>
          <LineChart data={filas} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="fecha" tickFormatter={fechaCorta} minTickGap={24} {...ejeProps} />
            <YAxis domain={[0, 1]} ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]} {...ejeProps} axisLine={false} />
            <Tooltip
              cursor={{ stroke: 'var(--axis)', strokeWidth: 1 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const f = payload[0].payload as Fila
                return (
                  <CajaTooltip
                    titulo={fechaCorta(String(label))}
                    filas={payload.map((p) => ({
                      color: String(p.color),
                      nombre: String(p.name),
                      valor: num(Number(p.value), 3),
                    }))}
                    pie={`${f.fuente} · nubosidad ${f.nubosidad} %`}
                  />
                )
              }}
            />
            <Legend itemSorter={null} verticalAlign="top" height={28} iconType="plainline" wrapperStyle={{ fontSize: 12, color: 'var(--ink-2)' }} />
            {indices.map((ind, i) => (
              <Line
                key={ind}
                dataKey={ind}
                name={ind}
                stroke={COLORES[i]}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

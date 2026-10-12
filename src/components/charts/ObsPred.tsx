import { useNavigate } from 'react-router-dom'
import {
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDatos } from '../../data/DataContext'
import { ESTADOS } from '../../data/schema'
import { COLOR_ESTADO } from '../../lib/colors'
import { tha } from '../../lib/format'
import { CajaTooltip, ejeProps } from './ChartTooltip'

interface Punto {
  id: string
  real: number
  pred: number
  municipio: string
}

/** Observado vs. predicho fuera de muestra (CV espacial). Tres estados → 3 tonos (válidos en todos los pares). */
export default function ObsPred() {
  const { parcelas } = useDatos()
  const navigate = useNavigate()
  const puntos = parcelas.filter((p) => p.props.rendimiento_real !== null && p.props.prediccion_cv !== null)
  const vals = puntos.flatMap((p) => [p.props.rendimiento_real!, p.props.prediccion_cv!])
  const lo = Math.floor(Math.min(...vals))
  const hi = Math.ceil(Math.max(...vals))

  if (!puntos.length) return <p className="text-sm text-ink-2">El modelo no incluye predicciones de validación cruzada.</p>

  return (
    <div className="h-80">
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 8, right: 12, bottom: 18, left: 0 }}>
          <CartesianGrid stroke="var(--grid)" />
          <XAxis
            type="number"
            dataKey="real"
            domain={[lo, hi]}
            tickCount={hi - lo + 1}
            {...ejeProps}
            label={{ value: 'Rendimiento reportado (t/ha)', position: 'insideBottom', offset: -12, fill: 'var(--ink-2)', fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey="pred"
            domain={[lo, hi]}
            tickCount={hi - lo + 1}
            {...ejeProps}
            label={{ value: 'Predicho (t/ha)', angle: -90, position: 'insideLeft', offset: 14, fill: 'var(--ink-2)', fontSize: 12 }}
          />
          <ReferenceLine
            segment={[
              { x: lo, y: lo },
              { x: hi, y: hi },
            ]}
            stroke="var(--muted)"
            strokeWidth={1}
            ifOverflow="hidden"
          />
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload as Punto
              const err = p.pred - p.real
              return (
                <CajaTooltip
                  titulo={`${p.id} · ${p.municipio}`}
                  filas={[
                    { color: 'var(--ink-2)', nombre: 'reportado', valor: tha(p.real) },
                    { color: String(payload[0].color), nombre: 'predicho', valor: tha(p.pred) },
                  ]}
                  pie={`Error: ${err >= 0 ? '+' : ''}${err.toFixed(2)} t/ha · clic para abrir`}
                />
              )
            }}
          />
          <Legend itemSorter={null} verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: 12, color: 'var(--ink-2)' }} />
          {ESTADOS.map((e) => (
            <Scatter
              key={e}
              name={e}
              data={puntos
                .filter((p) => p.props.estado === e)
                .map((p) => ({
                  id: p.props.id,
                  real: p.props.rendimiento_real!,
                  pred: p.props.prediccion_cv!,
                  municipio: p.props.municipio,
                }))}
              fill={COLOR_ESTADO[e]}
              stroke="var(--surface)"
              strokeWidth={2}
              cursor="pointer"
              onClick={(d) => navigate(`/parcela/${(d as unknown as { payload: Punto }).payload.id}`)}
              isAnimationActive={false}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import BarList from '../components/charts/BarList'
import Histograma from '../components/charts/Histograma'
import BuscadorId from '../components/BuscadorId'
import ParcelMap, { LeyendaMapa } from '../components/ParcelMap'
import { Card, PuntoEstado, Stat, botonSecCls } from '../components/ui'
import { useDatos } from '../data/DataContext'
import { useModo } from '../data/ModoContext'
import { ESTADOS } from '../data/schema'
import { COLOR_ESTADO, NIVEL_INFO, nivel, type Nivel } from '../lib/colors'
import { num, tha } from '../lib/format'

export default function Resumen() {
  const { parcelas, modelo, promedioEstado } = useDatos()
  const { modo } = useModo()
  const navigate = useNavigate()

  const porPredecir = parcelas.filter((p) => p.props.conjunto === 'prediccion')
  const preds = parcelas.map((p) => p.props.rendimiento_pred)
  const promedio = preds.reduce((a, b) => a + b, 0) / preds.length
  const hectareas = parcelas.reduce((s, p) => s + p.props.superficie_ha, 0)
  const produccion = parcelas.reduce((s, p) => s + p.props.rendimiento_pred * p.props.superficie_ha, 0)
  const conteoNivel = (['alto', 'medio', 'bajo'] as Nivel[]).map((n) => ({
    n,
    total: parcelas.filter((p) => nivel(p.props.rendimiento_pred, modelo.umbrales) === n).length,
  }))

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <p className="text-sm font-medium text-accent">Reto AgroCebada · Puebla, Tlaxcala e Hidalgo</p>
          <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">¿Cuánta cebada rendirá cada parcela?</h1>
          <p className="mt-3 max-w-prose text-ink-2">
            Con imágenes satelitales, clima y relieve estimamos el rendimiento de {parcelas.length} parcelas de cebada de
            temporal. La herramienta sirve al productor para anticipar su cosecha y a FIRA para dimensionar el
            financiamiento con información objetiva.
          </p>
          <div className="mt-5 max-w-md rounded-xl border border-line bg-surface p-4">
            <BuscadorId />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/mapa" className={botonSecCls}>
              Buscar en el mapa
            </Link>
            <Link to="/simulador" className={botonSecCls}>
              Probar el simulador
            </Link>
          </div>
        </div>
        <div className="space-y-2">
          <ParcelMap
            parcelas={parcelas}
            onSelect={(id) => navigate(`/mapa?sel=${id}`)}
            className="h-72"
          />
          <LeyendaMapa colorPor="pred" />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicadores principales">
        <Stat
          etiqueta="Rendimiento promedio estimado"
          valor={tha(promedio)}
          detalle={`${parcelas.length} parcelas · ${num(hectareas, 0)} ha`}
        />
        <Stat etiqueta="Producción estimada total" valor={`${num(produccion, 0)} t`} detalle="Rendimiento × superficie" />
        <Stat
          etiqueta="Parcelas por predecir"
          valor={porPredecir.length}
          detalle={`${parcelas.length - porPredecir.length} con rendimiento reportado`}
        />
        {modo === 'analista' ? (
          <Stat etiqueta="Error típico (RMSE)" valor={tha(modelo.metricas.rmse)} detalle={`R² ${num(modelo.metricas.r2, 2)} · CV espacial`} />
        ) : (
          <Stat
            etiqueta="Margen de error típico"
            valor={`± ${num(modelo.metricas.rmse, 1)} t/ha`}
            detalle="Qué tanto suele variar la estimación"
          />
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card titulo="Rendimiento estimado por estado" subtitulo="Promedio de todas las parcelas de cada estado.">
          <BarList
            items={ESTADOS.map((e) => ({
              clave: e,
              etiqueta: <PuntoEstado estado={e} />,
              valor: promedioEstado[e],
              texto: num(promedioEstado[e], 2),
              color: COLOR_ESTADO[e],
              detalle: `${parcelas.filter((p) => p.props.estado === e).length} parcelas`,
            }))}
            anchoEtiqueta="7rem"
          />
          <p className="mt-3 text-xs text-muted">t/ha. El color de cada estado es el mismo en toda la aplicación.</p>
        </Card>

        <Card
          titulo="¿Cuántas parcelas rinden bajo, medio o alto?"
          subtitulo={`Bajo: menos de ${num(modelo.umbrales.bajo, 1)} t/ha · Alto: ${num(modelo.umbrales.alto, 1)} t/ha o más`}
        >
          <ul className="mb-3 flex flex-wrap gap-4 text-sm">
            {conteoNivel.map(({ n, total }) => (
              <li key={n} className="flex items-center gap-1.5">
                <span aria-hidden style={{ color: NIVEL_INFO[n].color }}>
                  {NIVEL_INFO[n].icono}
                </span>
                <span className="font-semibold">{total}</span>
                <span className="text-ink-2">{NIVEL_INFO[n].etiqueta.toLowerCase()}</span>
              </li>
            ))}
          </ul>
          <Histograma valores={preds} umbrales={modelo.umbrales} />
          <p className="mt-1 text-center text-xs text-muted">Rendimiento estimado (t/ha) · número de parcelas</p>
        </Card>
      </div>

      {modo === 'productor' && (
        <Card titulo="¿Cómo funciona?">
          <ol className="grid gap-4 text-sm sm:grid-cols-3">
            {[
              ['Observamos desde el espacio', 'Satélites (Planet y Sentinel-2) miden qué tan verde y vigoroso está el cultivo casi a diario: cuándo emergió, cuánto duró verde y qué tan rápido se secó.'],
              ['Sumamos clima y terreno', 'Lluvia, temperatura, altura y pendiente de cada parcela influyen en la cosecha.'],
              ['El modelo aprende y estima', `Con ${parcelas.length - porPredecir.length} parcelas cuyo rendimiento conocemos, el modelo aprende y estima el de las demás.`],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft font-semibold">{i + 1}</span>
                <span>
                  <span className="block font-medium">{t}</span>
                  <span className="text-ink-2">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  )
}

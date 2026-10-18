import { Link, useParams } from 'react-router-dom'
import Contribuciones from '../components/charts/Contribuciones'
import SerieIndices from '../components/charts/SerieIndices'
import ParcelMap from '../components/ParcelMap'
import { Card, Insignia, PuntoEstado, Semaforo } from '../components/ui'
import { useDatos, useSerie } from '../data/DataContext'
import { useModo } from '../data/ModoContext'
import { GRUPOS, type Grupo } from '../data/schema'
import { contribuciones, entradasDeParcela } from '../model/surrogate'
import { conUnidad, num, signo, tha } from '../lib/format'
import NoEncontrado from './NoEncontrado'

const NOMBRE_GRUPO: Record<Grupo, string> = {
  indice: 'Índices de vegetación (satélite)',
  clima: 'Clima',
  geofisica: 'Terreno',
  otra: 'Otras',
}

export default function Parcela() {
  const { id = '' } = useParams()
  const { porId, modelo, promedioEstado, mediaVarEstado } = useDatos()
  const { modo } = useModo()
  const serie = useSerie(id)
  const parcela = porId.get(id)

  if (!parcela) return <NoEncontrado mensaje={`No existe la parcela "${id}".`} />

  const p = parcela.props
  const promedio = promedioEstado[p.estado]
  const dif = p.rendimiento_pred - promedio
  const entradas = entradasDeParcela(modelo.simulador, p)
  const aportes = entradas ? contribuciones(modelo.simulador, entradas) : null

  return (
    <div className="space-y-4">
      <nav className="text-sm text-ink-2">
        <Link to={`/mapa?sel=${p.id}`} className="hover:text-ink hover:underline">
          ← Volver al mapa
        </Link>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Parcela {p.id}</h1>
          <p className="text-ink-2">
            {p.municipio}, <PuntoEstado estado={p.estado} /> · {num(p.superficie_ha, 1)} ha
          </p>
        </div>
        <Insignia tono={p.conjunto === 'prediccion' ? 'acento' : 'neutro'}>
          {p.conjunto === 'prediccion' ? 'Parcela por predecir' : 'Parcela con rendimiento reportado'}
        </Insignia>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <div className="text-sm text-ink-2">Rendimiento estimado</div>
              <div className="text-5xl font-semibold">
                {num(p.rendimiento_pred, 2)} <span className="text-xl font-normal text-ink-2">t/ha</span>
              </div>
              <div className="tabular mt-1 text-sm text-ink-2">
                {modo === 'analista'
                  ? `${modelo.intervalo}: ${num(p.pred_lo, 2)} – ${num(p.pred_hi, 2)} t/ha`
                  : `Lo más probable: entre ${num(p.pred_lo, 1)} y ${num(p.pred_hi, 1)} t/ha`}
              </div>
              <div className="mt-4">
                <Semaforo valor={p.rendimiento_pred} umbrales={modelo.umbrales} conConsejo={modo === 'productor'} />
              </div>
            </div>
            <dl className="grid content-start gap-4 text-sm">
              <div>
                <dt className="text-ink-2">Producción estimada de la parcela</dt>
                <dd className="text-xl font-semibold">{num(p.rendimiento_pred * p.superficie_ha, 1)} toneladas</dd>
              </div>
              <div>
                <dt className="text-ink-2">Comparado con el promedio de {p.estado}</dt>
                <dd className="text-xl font-semibold">
                  <span style={{ color: dif >= 0 ? 'var(--good-text)' : 'var(--critical-text)' }}>
                    {dif >= 0 ? '▲' : '▼'} {signo(dif)} t/ha
                  </span>
                </dd>
                <dd className="text-xs text-muted">Promedio estimado del estado: {tha(promedio)}</dd>
              </div>
              {p.rendimiento_real !== null && (
                <div>
                  <dt className="text-ink-2">Rendimiento reportado</dt>
                  <dd className="text-xl font-semibold">{tha(p.rendimiento_real)}</dd>
                  {modo === 'analista' && p.prediccion_cv !== null && (
                    <dd className="tabular text-xs text-muted">
                      Predicción fuera de muestra (CV): {tha(p.prediccion_cv)} · error {signo(p.prediccion_cv - p.rendimiento_real)}
                    </dd>
                  )}
                </div>
              )}
            </dl>
          </div>
        </Card>
        <ParcelMap parcelas={[parcela]} seleccionada={p.id} className="h-64 lg:h-auto lg:min-h-64" enfocarSeleccion />
      </div>

      {p.nota && (
        <Card
          titulo="¿Cómo se llegó a este número?"
          subtitulo={
            modo === 'productor'
              ? 'Explicación en palabras sencillas, calculada para esta parcela.'
              : 'Contribuciones SHAP del ensamble, agrupadas por tipo de variable.'
          }
        >
          <p className="text-sm text-ink">{p.nota}</p>
          {p.factores && p.factores.length > 0 && (
            <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
              {p.factores.map((f) => (
                <li key={f.variable} className="flex items-baseline justify-between gap-3 border-b border-line pb-1">
                  <span className="text-ink-2">{f.etiqueta}</span>
                  <span
                    className="tabular font-medium"
                    style={{ color: f.aporte >= 0 ? 'var(--good-text)' : 'var(--critical-text)' }}
                  >
                    {signo(f.aporte)} t/ha
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          titulo="Vigor del cultivo a lo largo del ciclo"
          subtitulo={
            modo === 'productor'
              ? 'Mientras más alta la curva, más verde y sano estuvo el cultivo.'
              : 'Índices de vegetación por fecha de observación satelital.'
          }
        >
          {serie.error ? (
            <p className="text-sm text-[var(--critical-text)]">No se pudo cargar la serie: {serie.error}</p>
          ) : serie.obs ? (
            <SerieIndices obs={serie.obs} />
          ) : (
            <p className="text-sm text-ink-2" role="status">
              Cargando serie temporal…
            </p>
          )}
        </Card>

        <Card
          titulo={modo === 'productor' ? 'Qué pasaría si cambiara cada condición' : 'Aporte de cada variable (simulador)'}
          subtitulo={
            modo === 'productor'
              ? 'Comparado con una parcela promedio de la región, según el simulador.'
              : 'Descomposición del simulador lineal sustituto: coef × (x − media) / std, en t/ha.'
          }
        >
          {aportes ? (
            <Contribuciones items={aportes} />
          ) : (
            <p className="text-sm text-ink-2">Faltan variables del simulador en esta parcela.</p>
          )}
        </Card>
      </div>

      <Card titulo="Condiciones de la parcela" subtitulo={`Comparadas con el promedio de las parcelas de ${p.estado}.`}>
        <div className="grid gap-6 md:grid-cols-3">
          {GRUPOS.map((g) => {
            const vars = modelo.variables.filter((v) => v.grupo === g)
            if (!vars.length) return null
            return (
              <div key={g}>
                <h3 className="mb-2 text-sm font-medium">{NOMBRE_GRUPO[g]}</h3>
                <dl className="space-y-2 text-sm">
                  {vars.map((v) => {
                    const val = p[v.nombre]
                    const media = mediaVarEstado[p.estado][v.nombre]
                    return (
                      <div key={v.nombre} className="flex items-baseline justify-between gap-3 border-b border-line pb-1.5">
                        <dt className="text-ink-2" title={v.descripcion}>
                          {v.etiqueta}
                        </dt>
                        <dd className="tabular text-right">
                          <span className="font-medium">
                            {typeof val === 'number' ? conUnidad(val, v.unidad) : '—'}
                          </span>
                          {Number.isFinite(media) && (
                            <span className="block text-xs text-muted">prom. {conUnidad(media, v.unidad)}</span>
                          )}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

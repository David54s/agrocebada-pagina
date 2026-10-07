import { useMemo, useState, type ChangeEvent } from 'react'
import Contribuciones from '../components/charts/Contribuciones'
import { Card, Semaforo, botonCls, botonSecCls, selectCls } from '../components/ui'
import { useDatos } from '../data/DataContext'
import { useModo } from '../data/ModoContext'
import { GRUPOS, type Simulador as Sim } from '../data/schema'
import { aCsv, descargar, leerCsvLote, plantillaCsv, type ResultadoLote } from '../lib/csv'
import { conUnidad, num } from '../lib/format'
import { contribuciones, entradasDeParcela, entradasMedias, predecir, type Entradas } from '../model/surrogate'

const GRUPO_TITULO = { indice: 'Satélite', clima: 'Clima', geofisica: 'Terreno', otra: 'Otras' } as const

function rango(v: Sim['variables'][number]) {
  const margen = (v.max - v.min) * 0.1
  const min = v.min - margen
  const max = v.max + margen
  const paso = Number(((max - min) / 200).toPrecision(1))
  return { min: Number(min.toFixed(3)), max: Number(max.toFixed(3)), paso }
}

const decimales = (paso: number) => Math.max(0, Math.min(3, -Math.floor(Math.log10(paso))))

export default function Simulador() {
  const { modelo, parcelas, porId, variables } = useDatos()
  const { modo } = useModo()
  const sim = modelo.simulador

  const [entradas, setEntradas] = useState<Entradas>(() => entradasMedias(sim))
  const [base, setBase] = useState('')
  const [hectareas, setHectareas] = useState(5)
  const [lote, setLote] = useState<(ResultadoLote & { archivo: string }) | null>(null)

  const pred = predecir(sim, entradas)
  const aportes = contribuciones(sim, entradas)

  const cargarParcela = (id: string) => {
    setBase(id)
    const p = id ? porId.get(id) : undefined
    const x = p ? entradasDeParcela(sim, p.props) : null
    setEntradas(x ?? entradasMedias(sim))
    if (p) setHectareas(p.props.superficie_ha)
  }

  const resultadosLote = useMemo(
    () =>
      lote?.filas.map((f) => {
        const r = predecir(sim, f.entradas)
        return { ID_POLIGONO: f.id, rendimiento_pred: Number(r.toFixed(3)) }
      }) ?? [],
    [lote, sim],
  )

  const leerArchivo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setLote({ ...leerCsvLote(await f.text(), sim), archivo: f.name })
    e.target.value = ''
  }

  const ejemploLote = () => {
    const filas = parcelas
      .filter((p) => p.props.conjunto === 'prediccion')
      .map((p) => ({ ID_POLIGONO: p.props.id, ...entradasDeParcela(sim, p.props) }))
    setLote({ ...leerCsvLote(aCsv(filas), sim), archivo: 'parcelas por predecir (ejemplo)' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Simulador de rendimiento</h1>
        <p className="max-w-prose text-sm text-ink-2">
          {modo === 'productor'
            ? 'Mueve los controles para ver cómo cambiaría la cosecha esperada si cambian las condiciones de tu parcela.'
            : `Ejecuta el modelo en el navegador. ${sim.descripcion} ${sim.rmse !== undefined ? `RMSE del sustituto: ${num(sim.rmse, 3)} t/ha.` : ''}`}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card
          titulo="Condiciones"
          accion={
            <div className="flex flex-wrap items-center gap-2">
              <select aria-label="Partir de una parcela" className={selectCls} value={base} onChange={(e) => cargarParcela(e.target.value)}>
                <option value="">Parcela promedio</option>
                {parcelas.map((p) => (
                  <option key={p.props.id} value={p.props.id}>
                    {p.props.id} · {p.props.municipio}
                  </option>
                ))}
              </select>
              <button type="button" className={botonSecCls} onClick={() => cargarParcela(base)}>
                Restablecer
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            {GRUPOS.map((g) => {
              const vars = sim.variables.filter((v) => variables.get(v.nombre)?.grupo === g)
              if (!vars.length) return null
              return (
                <fieldset key={g}>
                  <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{GRUPO_TITULO[g]}</legend>
                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {vars.map((v) => {
                      const meta = variables.get(v.nombre)!
                      const { min, max, paso } = rango(v)
                      const valor = entradas[v.nombre]
                      const set = (n: number) => Number.isFinite(n) && setEntradas((x) => ({ ...x, [v.nombre]: n }))
                      return (
                        <div key={v.nombre}>
                          <div className="flex items-baseline justify-between gap-2 text-sm">
                            <label htmlFor={`sl-${v.nombre}`} className="font-medium">
                              {meta.etiqueta}
                            </label>
                            <span className="flex items-center gap-1">
                              <input
                                type="number"
                                aria-label={`${meta.etiqueta} (valor exacto)`}
                                className="tabular w-20 rounded border border-line bg-surface px-1.5 py-0.5 text-right text-sm"
                                value={Number(valor.toFixed(decimales(paso)))}
                                step={paso}
                                onChange={(e) => set(e.target.valueAsNumber)}
                              />
                              <span className="w-6 text-xs text-muted">{meta.unidad}</span>
                            </span>
                          </div>
                          <input
                            id={`sl-${v.nombre}`}
                            type="range"
                            className="mt-1 w-full"
                            min={min}
                            max={max}
                            step={paso}
                            value={valor}
                            onChange={(e) => set(Number(e.target.value))}
                            aria-valuetext={conUnidad(valor, meta.unidad)}
                          />
                          {modo === 'productor' && meta.descripcion && (
                            <p className="text-xs text-muted">{meta.descripcion}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </fieldset>
              )
            })}
          </div>
        </Card>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <div className="text-sm text-ink-2">Rendimiento esperado</div>
            <output className="block text-5xl font-semibold" aria-live="polite">
              {num(pred, 2)} <span className="text-xl font-normal text-ink-2">t/ha</span>
            </output>
            {sim.rmse !== undefined && (
              <div className="mt-1 text-sm text-ink-2">± {num(sim.rmse, 2)} t/ha de error típico</div>
            )}
            <div className="mt-3">
              <Semaforo valor={pred} umbrales={modelo.umbrales} conConsejo={modo === 'productor'} />
            </div>
            <div className="mt-4 flex items-end gap-3 border-t border-line pt-4 text-sm">
              <label className="flex flex-col">
                <span className="text-ink-2">Superficie (ha)</span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={hectareas}
                  onChange={(e) => setHectareas(Math.max(0, e.target.valueAsNumber || 0))}
                  className="tabular mt-1 w-24 rounded border border-line bg-surface px-2 py-1"
                />
              </label>
              <div>
                <div className="text-ink-2">Producción estimada</div>
                <div className="text-xl font-semibold">{num(pred * hectareas, 1)} t</div>
              </div>
            </div>
          </Card>
          <Card titulo={modo === 'productor' ? '¿Qué está pesando más?' : 'Aporte por variable'}>
            <Contribuciones items={aportes} />
          </Card>
        </div>
      </div>

      <Card
        titulo="Predicción por lote (CSV)"
        subtitulo="Sube un archivo con una fila por parcela y una columna por variable. Se acepta punto o coma decimal."
      >
        <div className="flex flex-wrap items-center gap-2">
          <label className={`${botonCls} cursor-pointer`}>
            Subir CSV
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={leerArchivo} />
          </label>
          <button type="button" className={botonSecCls} onClick={() => descargar('plantilla_agrocebada.csv', plantillaCsv(sim))}>
            Descargar plantilla
          </button>
          <button type="button" className={botonSecCls} onClick={ejemploLote}>
            Probar con las {parcelas.filter((p) => p.props.conjunto === 'prediccion').length} parcelas por predecir
          </button>
          <span className="text-xs text-muted">Columnas: ID_POLIGONO, {sim.variables.map((v) => v.nombre).join(', ')}</span>
        </div>

        {lote && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                <strong>{lote.archivo}</strong>: {resultadosLote.length} parcelas procesadas
                {lote.errores.length > 0 && `, ${lote.errores.length} con errores`}
              </span>
              {resultadosLote.length > 0 && (
                <button
                  type="button"
                  className={botonCls}
                  onClick={() => descargar('predicciones_agrocebada.csv', aCsv(resultadosLote))}
                >
                  Descargar resultados
                </button>
              )}
            </div>
            {lote.errores.length > 0 && (
              <ul className="max-h-32 overflow-auto rounded-lg bg-surface-2 p-3 text-xs text-[var(--critical-text)]">
                {lote.errores.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
            {resultadosLote.length > 0 && (
              <div className="max-h-72 overflow-auto rounded-lg border border-line">
                <table className="tabular w-full text-sm">
                  <thead className="sticky top-0 bg-surface-2 text-ink-2">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left font-medium">ID_POLIGONO</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Rendimiento (t/ha)</th>
                      <th scope="col" className="px-3 py-2 text-left font-medium">Nivel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultadosLote.map((r) => (
                      <tr key={r.ID_POLIGONO} className="border-t border-line">
                        <td className="px-3 py-1.5">{r.ID_POLIGONO}</td>
                        <td className="px-3 py-1.5 text-right font-medium">{num(r.rendimiento_pred, 2)}</td>
                        <td className="px-3 py-1.5">
                          <Semaforo valor={r.rendimiento_pred} umbrales={modelo.umbrales} compacto />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>
      <p className="text-xs text-muted">
        Las predicciones del simulador son aproximadas. Valores fuera del rango observado en las parcelas del reto son
        extrapolaciones y deben tomarse con cautela.
      </p>
    </div>
  )
}

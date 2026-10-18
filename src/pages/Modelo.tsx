import type { ReactNode } from 'react'
import BarList from '../components/charts/BarList'
import ObsPred from '../components/charts/ObsPred'
import { Card, PuntoEstado, Stat, botonCls, botonSecCls } from '../components/ui'
import { urlDatos, useDatos } from '../data/DataContext'
import { useModo } from '../data/ModoContext'
import { GRUPOS, type Grupo } from '../data/schema'
import { COLOR_ESTADO } from '../lib/colors'
import { num } from '../lib/format'

const NOMBRE_GRUPO: Record<Grupo, string> = {
  indice: 'Índices de vegetación',
  clima: 'Clima',
  geofisica: 'Terreno (DEM)',
  otra: 'Otras',
}

const pct = (v: number) => `${num(v * 100, 0)} %`

export default function Modelo() {
  const { modelo, variables, parcelas } = useDatos()
  const { modo, setModo } = useModo()
  const { metricas, importancias, combinaciones } = modelo

  const etiqueta = (n: string) => variables.get(n)?.etiqueta ?? n
  const total = importancias.reduce((s, i) => s + i.importancia, 0) || 1
  const imp = [...importancias].sort((a, b) => b.importancia - a.importancia).map((i) => ({ ...i, rel: i.importancia / total }))
  const porGrupo = GRUPOS.map((g) => ({
    g,
    rel: imp.filter((i) => variables.get(i.variable)?.grupo === g).reduce((s, i) => s + i.rel, 0),
  })).filter((x) => x.rel > 0)
  const mejorDe = (g: Grupo) => imp.find((i) => variables.get(i.variable)?.grupo === g)
  const mejorIndice = mejorDe('indice')
  const mejorClima = mejorDe('clima')
  const combos = [...combinaciones].sort((a, b) => a.rmse - b.rmse)
  const mejorCombo = combos[0]
  const nEntr = parcelas.filter((p) => p.props.conjunto === 'entrenamiento').length

  const descargarCsv = (
    <a href={urlDatos('predicciones.csv')} download="predicciones_59_parcelas.csv" className={botonCls}>
      Descargar predicciones (CSV)
    </a>
  )

  if (modo === 'productor')
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold">¿Qué tan confiable es la estimación?</h1>
        <Card>
          <p className="text-lg">
            En promedio, la estimación se aleja <strong>± {num(metricas.rmse, 1)} toneladas por hectárea</strong> del
            rendimiento reportado al cosechar.
          </p>
          <p className="mt-2 text-sm text-ink-2">
            Lo medimos con {nEntr} parcelas cuyo rendimiento conocemos: cada una se estimó con un modelo que no la vio
            al aprender, para simular parcelas nuevas.
          </p>
        </Card>
        <Card titulo="Lo que más influye en la cosecha">
          <ol className="space-y-3">
            {imp.slice(0, 3).map((i, k) => (
              <li key={i.variable} className="flex gap-3 text-sm">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft font-semibold">{k + 1}</span>
                <span>
                  <span className="block font-medium">{etiqueta(i.variable)}</span>
                  <span className="text-ink-2">{variables.get(i.variable)?.descripcion}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={botonSecCls} onClick={() => setModo('analista')}>
            Ver detalle técnico (modo analista)
          </button>
          {descargarCsv}
        </div>
      </div>
    )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Desempeño del modelo</h1>
          <p className="text-sm text-ink-2">
            {modelo.nombre} · v{modelo.version} · {metricas.validacion}
          </p>
        </div>
        {descargarCsv}
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Métricas de validación">
        <Stat etiqueta="RMSE" valor={`${num(metricas.rmse, 3)} t/ha`} detalle="Métrica principal de FIRA" />
        <Stat etiqueta="MAE" valor={`${num(metricas.mae, 3)} t/ha`} />
        <Stat etiqueta="R²" valor={num(metricas.r2, 3)} />
        <Stat etiqueta="Parcelas de entrenamiento" valor={nEntr} detalle="Rendimiento reportado" />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card titulo="Observado vs. predicho" subtitulo="Predicciones fuera de muestra. La diagonal es la predicción perfecta.">
          <ObsPred />
        </Card>
        <Card titulo="Error por estado" subtitulo="RMSE (t/ha) de la validación cruzada.">
          <BarList
            items={metricas.por_estado.map((m) => ({
              clave: m.estado,
              etiqueta: <PuntoEstado estado={m.estado} />,
              valor: m.rmse,
              texto: num(m.rmse, 3),
              color: COLOR_ESTADO[m.estado],
            }))}
            anchoEtiqueta="6.5rem"
          />
          <table className="tabular mt-4 w-full text-sm">
            <thead className="text-ink-2">
              <tr>
                <th scope="col" className="py-1 text-left font-medium">Estado</th>
                <th scope="col" className="py-1 text-right font-medium">n</th>
                <th scope="col" className="py-1 text-right font-medium">MAE</th>
                <th scope="col" className="py-1 text-right font-medium">R²</th>
              </tr>
            </thead>
            <tbody>
              {metricas.por_estado.map((m) => (
                <tr key={m.estado} className="border-t border-line">
                  <td className="py-1">{m.estado}</td>
                  <td className="py-1 text-right">{m.n}</td>
                  <td className="py-1 text-right">{num(m.mae, 3)}</td>
                  <td className="py-1 text-right">{num(m.r2, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          titulo="Importancia de variables"
          subtitulo="Importancia por permutación (aumento del RMSE al barajar cada variable), normalizada a 100 %."
        >
          <BarList
            items={imp.map((i) => ({
              clave: i.variable,
              etiqueta: etiqueta(i.variable),
              valor: i.rel,
              texto: pct(i.rel),
              detalle: variables.get(i.variable)?.descripcion,
            }))}
          />
          <h3 className="mb-2 mt-5 text-sm font-medium">Por tipo de variable</h3>
          <BarList
            items={porGrupo.map((x) => ({ clave: x.g, etiqueta: NOMBRE_GRUPO[x.g], valor: x.rel, texto: pct(x.rel) }))}
            max={1}
          />
        </Card>
        <Card titulo="Combinaciones de variables" subtitulo="Mismo esquema de validación con distintos conjuntos de variables.">
          <div className="overflow-x-auto">
            <table className="tabular w-full text-sm">
              <thead className="text-ink-2">
                <tr>
                  <th scope="col" className="py-1.5 text-left font-medium">Conjunto</th>
                  <th scope="col" className="py-1.5 text-right font-medium">RMSE</th>
                  <th scope="col" className="py-1.5 text-right font-medium">R²</th>
                </tr>
              </thead>
              <tbody>
                {combos.map((c) => (
                  <tr key={c.nombre} className={`border-t border-line ${c === mejorCombo ? 'bg-accent-soft font-medium' : ''}`}>
                    <td className="py-1.5 pl-1" title={c.variables.map(etiqueta).join(', ')}>
                      {c.nombre}
                      {c === mejorCombo && <span className="ml-1 text-xs">(mejor)</span>}
                    </td>
                    <td className="py-1.5 text-right">{num(c.rmse, 3)}</td>
                    <td className="py-1.5 pr-1 text-right">{num(c.r2, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card
        titulo="Preguntas guía del reto"
        subtitulo={
          modelo.preguntas_guia
            ? 'Respuestas del equipo de modelación, con la evidencia de la validación cruzada.'
            : 'Respuestas calculadas a partir de las salidas del modelo.'
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Pregunta n={1} q="¿Qué índice es más importante en la predicción?">
            {modelo.preguntas_guia ? (
              <Respuesta r={modelo.preguntas_guia.indice} />
            ) : mejorIndice ? (
              <>
                <strong>{etiqueta(mejorIndice.variable)}</strong>, con {pct(mejorIndice.rel)} de la importancia total. Los
                índices de vegetación en conjunto suman {pct(porGrupo.find((x) => x.g === 'indice')?.rel ?? 0)}.
              </>
            ) : (
              'El modelo no usa índices de vegetación.'
            )}
          </Pregunta>
          <Pregunta n={2} q="¿Qué variable climática tiene mayor peso?">
            {modelo.preguntas_guia ? (
              <Respuesta r={modelo.preguntas_guia.clima} />
            ) : mejorClima ? (
              <>
                <strong>{etiqueta(mejorClima.variable)}</strong>, con {pct(mejorClima.rel)} de la importancia. Es coherente
                con que todas las parcelas sean de temporal.
              </>
            ) : (
              'El modelo no usa variables climáticas.'
            )}
          </Pregunta>
          <Pregunta n={3} q="¿Qué combinación de variables funciona mejor?">
            {modelo.preguntas_guia ? (
              <Respuesta r={modelo.preguntas_guia.combinacion} />
            ) : mejorCombo ? (
              <>
                <strong>{mejorCombo.nombre}</strong>: RMSE {num(mejorCombo.rmse, 3)} t/ha y R² {num(mejorCombo.r2, 3)}.
                {combos.length > 1 &&
                  ` Frente a la peor combinación (${combos.at(-1)!.nombre}) reduce el error en ${num(
                    combos.at(-1)!.rmse - mejorCombo.rmse,
                    3,
                  )} t/ha.`}
              </>
            ) : (
              'No se reportaron combinaciones.'
            )}
          </Pregunta>
        </div>
      </Card>
    </div>
  )
}

function Respuesta({ r }: { r: { respuesta: string; detalle: string } }) {
  return (
    <>
      <strong>{r.respuesta}.</strong>
      {r.detalle && <span className="mt-1 block text-xs text-muted">{r.detalle}</span>}
    </>
  )
}

function Pregunta({ n, q, children }: { n: number; q: string; children: ReactNode }) {
  return (
    <div className="rounded-lg bg-surface-2 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">Pregunta {n}</div>
      <div className="mt-1 font-medium">{q}</div>
      <p className="mt-2 text-sm text-ink-2">{children}</p>
    </div>
  )
}

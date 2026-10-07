import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PanelParcela from '../components/PanelParcela'
import ParcelMap, { LeyendaMapa, type ColorPor } from '../components/ParcelMap'
import { Card, Insignia, PuntoEstado, Segmentado, Semaforo, selectCls } from '../components/ui'
import { useDatos, type Parcela } from '../data/DataContext'
import { useModo } from '../data/ModoContext'
import { ESTADOS, type Conjunto, type Estado } from '../data/schema'
import { num } from '../lib/format'

type Orden = 'id' | 'municipio' | 'superficie' | 'pred' | 'real'

const VALOR_ORDEN: Record<Orden, (p: Parcela) => string | number> = {
  id: (p) => p.props.id,
  municipio: (p) => p.props.municipio,
  superficie: (p) => p.props.superficie_ha,
  pred: (p) => p.props.rendimiento_pred,
  real: (p) => p.props.rendimiento_real ?? -1,
}

export default function Mapa() {
  const { parcelas, porId, modelo } = useDatos()
  const { modo } = useModo()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const sel = params.get('sel') ?? undefined

  const [estado, setEstado] = useState<Estado | 'todos'>('todos')
  const [conjunto, setConjunto] = useState<Conjunto | 'todos'>('todos')
  const [colorPor, setColorPor] = useState<ColorPor>('pred')
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<{ col: Orden; asc: boolean }>({ col: 'pred', asc: false })

  const filtradas = useMemo(
    () =>
      parcelas.filter(
        (p) =>
          (estado === 'todos' || p.props.estado === estado) && (conjunto === 'todos' || p.props.conjunto === conjunto),
      ),
    [parcelas, estado, conjunto],
  )

  const tabla = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const f = q
      ? filtradas.filter((p) => p.props.id.toLowerCase().includes(q) || p.props.municipio.toLowerCase().includes(q))
      : filtradas
    const val = VALOR_ORDEN[orden.col]
    return [...f].sort((a, b) => {
      const va = val(a)
      const vb = val(b)
      const c = typeof va === 'number' ? va - (vb as number) : va.localeCompare(vb as string, 'es')
      return orden.asc ? c : -c
    })
  }, [filtradas, busqueda, orden])

  const seleccionar = (id: string) => setParams({ sel: id }, { replace: true })

  const encabezado = (col: Orden, texto: string, num = false) => (
    <th
      scope="col"
      aria-sort={orden.col === col ? (orden.asc ? 'ascending' : 'descending') : 'none'}
      className={`px-3 py-2 font-medium ${num ? 'text-right' : 'text-left'}`}
    >
      <button
        type="button"
        className="hover:text-ink"
        onClick={() => setOrden((o) => ({ col, asc: o.col === col ? !o.asc : col === 'id' || col === 'municipio' }))}
      >
        {texto} {orden.col === col ? (orden.asc ? '↑' : '↓') : ''}
      </button>
    </th>
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Mapa de parcelas</h1>
        <p className="text-sm text-ink-2">
          {modo === 'productor'
            ? 'Busca tu parcela en el mapa o en la tabla para ver cuánto se espera que rinda.'
            : 'Rendimiento estimado por parcela. Usa la capa satelital para revisar el contexto de cada polígono.'}
        </p>
      </div>

      {/* Filtros: una fila, arriba de todo lo que afectan */}
      <div className="flex flex-wrap items-center gap-3">
        <select aria-label="Estado" className={selectCls} value={estado} onChange={(e) => setEstado(e.target.value as Estado | 'todos')}>
          <option value="todos">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
        <select
          aria-label="Conjunto"
          className={selectCls}
          value={conjunto}
          onChange={(e) => setConjunto(e.target.value as Conjunto | 'todos')}
        >
          <option value="todos">Todas las parcelas</option>
          <option value="entrenamiento">Con rendimiento reportado</option>
          <option value="prediccion">
            Por predecir ({parcelas.filter((p) => p.props.conjunto === 'prediccion').length})
          </option>
        </select>
        <Segmentado
          etiqueta="Colorear por"
          valor={colorPor}
          onChange={setColorPor}
          opciones={[
            { valor: 'pred', texto: 'Estimado' },
            { valor: 'real', texto: 'Reportado' },
          ]}
        />
        <span className="text-sm text-muted">{filtradas.length} parcelas</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-2">
          <ParcelMap
            parcelas={filtradas}
            colorPor={colorPor}
            seleccionada={sel}
            onSelect={seleccionar}
            className="h-[420px] lg:h-[540px]"
            enfocarSeleccion
          />
          <LeyendaMapa colorPor={colorPor} />
        </div>
        <PanelParcela parcela={sel ? porId.get(sel) : undefined} />
      </div>

      <Card
        titulo="Tabla de parcelas"
        subtitulo="La misma información del mapa, para buscar y ordenar."
        accion={
          <input
            type="search"
            placeholder="Buscar ID_POLIGONO o municipio…"
            aria-label="Buscar parcela"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className={`${selectCls} w-56`}
          />
        }
      >
        <div className="max-h-[420px] overflow-auto rounded-lg border border-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="sticky top-0 z-10 bg-surface-2 text-ink-2">
              <tr>
                {encabezado('id', 'ID_POLIGONO')}
                {encabezado('municipio', 'Municipio')}
                <th scope="col" className="px-3 py-2 text-left font-medium">Estado</th>
                {encabezado('superficie', 'Superficie (ha)', true)}
                {encabezado('pred', 'Estimado (t/ha)', true)}
                {encabezado('real', 'Reportado (t/ha)', true)}
                <th scope="col" className="px-3 py-2 text-left font-medium">Nivel</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {tabla.map((p) => (
                <tr
                  key={p.props.id}
                  onClick={() => seleccionar(p.props.id)}
                  onDoubleClick={() => navigate(`/parcela/${p.props.id}`)}
                  className={`cursor-pointer border-t border-line hover:bg-surface-2 ${
                    p.props.id === sel ? 'bg-accent-soft' : ''
                  }`}
                >
                  <td className="px-3 py-1.5">
                    <button type="button" className="font-medium underline-offset-2 hover:underline" onClick={() => seleccionar(p.props.id)}>
                      {p.props.id}
                    </button>
                    {p.props.conjunto === 'prediccion' && (
                      <span className="ml-2">
                        <Insignia tono="acento">por predecir</Insignia>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5">{p.props.municipio}</td>
                  <td className="px-3 py-1.5">
                    <PuntoEstado estado={p.props.estado} />
                  </td>
                  <td className="px-3 py-1.5 text-right">{num(p.props.superficie_ha, 1)}</td>
                  <td className="px-3 py-1.5 text-right font-medium">{num(p.props.rendimiento_pred, 2)}</td>
                  <td className="px-3 py-1.5 text-right text-ink-2">
                    {p.props.rendimiento_real === null ? '—' : num(p.props.rendimiento_real, 2)}
                  </td>
                  <td className="px-3 py-1.5">
                    <Semaforo valor={p.props.rendimiento_pred} umbrales={modelo.umbrales} compacto />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

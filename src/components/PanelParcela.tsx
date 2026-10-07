import { Link } from 'react-router-dom'
import { useDatos, type Parcela } from '../data/DataContext'
import { useModo } from '../data/ModoContext'
import { num, tha } from '../lib/format'
import { Insignia, PuntoEstado, Semaforo, botonCls } from './ui'

/** Resumen compacto de una parcela (panel lateral del mapa). */
export default function PanelParcela({ parcela }: { parcela?: Parcela }) {
  const { modelo } = useDatos()
  const { modo } = useModo()

  if (!parcela)
    return (
      <div className="grid h-full place-items-center rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-2">
        Haz clic en una parcela del mapa o de la tabla para ver su estimación.
      </div>
    )

  const p = parcela.props
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Parcela {p.id}</h2>
          <p className="text-sm text-ink-2">
            {p.municipio}, <PuntoEstado estado={p.estado} />
          </p>
        </div>
        <Insignia tono={p.conjunto === 'prediccion' ? 'acento' : 'neutro'}>
          {p.conjunto === 'prediccion' ? 'Por predecir' : 'Con dato'}
        </Insignia>
      </div>

      <div className="mt-4 text-sm text-ink-2">Rendimiento estimado</div>
      <div className="text-4xl font-semibold">
        {num(p.rendimiento_pred, 2)} <span className="text-lg font-normal text-ink-2">t/ha</span>
      </div>
      {modo === 'analista' && (
        <div className="tabular mt-1 text-xs text-muted">
          {modelo.intervalo}: {num(p.pred_lo, 2)} – {num(p.pred_hi, 2)}
        </div>
      )}
      <div className="mt-3">
        <Semaforo valor={p.rendimiento_pred} umbrales={modelo.umbrales} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-ink-2">Superficie</dt>
          <dd className="font-medium">{num(p.superficie_ha, 1)} ha</dd>
        </div>
        <div>
          <dt className="text-ink-2">Producción estimada</dt>
          <dd className="font-medium">{num(p.rendimiento_pred * p.superficie_ha, 1)} t</dd>
        </div>
        {p.rendimiento_real !== null && (
          <div className="col-span-2">
            <dt className="text-ink-2">Reportado por el productor</dt>
            <dd className="font-medium">{tha(p.rendimiento_real)}</dd>
          </div>
        )}
      </dl>

      <Link to={`/parcela/${p.id}`} className={`${botonCls} mt-4 w-full`}>
        Ver ficha completa →
      </Link>
    </div>
  )
}

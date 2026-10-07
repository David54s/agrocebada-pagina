import 'leaflet/dist/leaflet.css'
import { latLngBounds, type LatLngExpression } from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import {
  CircleMarker,
  LayersControl,
  MapContainer,
  Polygon,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { useDatos, type Parcela } from '../data/DataContext'
import { colorClase } from '../lib/colors'
import { tha } from '../lib/format'

export type ColorPor = 'pred' | 'real'

const SIN_DATO = '#9a988f'
const ZOOM_POLIGONOS = 13

export function valorColor(p: Parcela, por: ColorPor): number | null {
  return por === 'real' ? p.props.rendimiento_real : p.props.rendimiento_pred
}

function anillos(p: Parcela): LatLngExpression[][][] {
  const polys = p.geometry.type === 'Polygon' ? [p.geometry.coordinates] : p.geometry.coordinates
  return polys.map((poly) => poly.map((ring) => ring.map(([lon, lat]) => [lat, lon] as LatLngExpression)))
}

function AjustarVista({ parcelas, enfocar }: { parcelas: Parcela[]; enfocar?: Parcela }) {
  const map = useMap()
  const clave = parcelas.map((p) => p.props.id).join(',')
  useEffect(() => {
    if (!parcelas.length) return
    map.fitBounds(latLngBounds(parcelas.map((p) => p.centro)), { padding: [24, 24], maxZoom: 12 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, map])
  useEffect(() => {
    if (enfocar) map.flyTo(enfocar.centro, Math.max(map.getZoom(), 14), { duration: 0.6 })
  }, [enfocar, map])
  return null
}

function Capa({
  parcelas,
  colorPor,
  seleccionada,
  onSelect,
}: {
  parcelas: Parcela[]
  colorPor: ColorPor
  seleccionada?: string
  onSelect?: (id: string) => void
}) {
  const { clases } = useDatos()
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) })
  const poligonos = zoom >= ZOOM_POLIGONOS

  return (
    <>
      {parcelas.map((p) => {
        const v = valorColor(p, colorPor)
        const relleno = v === null ? SIN_DATO : colorClase(v, clases)
        const sel = p.props.id === seleccionada
        const handlers = { click: () => onSelect?.(p.props.id) }
        const tip = (
          <Tooltip className="parcela-tip" direction="top" offset={[0, -6]}>
            <div className="text-xs">
              <strong>{p.props.id}</strong> · {p.props.municipio}, {p.props.estado}
              <div className="mt-0.5 text-sm font-semibold">
                {v === null ? 'Sin rendimiento reportado' : tha(v)}
              </div>
              <div className="text-ink-2">{colorPor === 'real' ? 'Reportado por el productor' : 'Estimado por el modelo'}</div>
            </div>
          </Tooltip>
        )
        return poligonos ? (
          <Polygon
            key={p.props.id}
            positions={anillos(p)}
            eventHandlers={handlers}
            pathOptions={{
              color: sel ? '#0b0b0b' : '#ffffff',
              weight: sel ? 3 : 1.5,
              fillColor: relleno,
              fillOpacity: v === null ? 0.35 : 0.85,
            }}
          >
            {tip}
          </Polygon>
        ) : (
          <CircleMarker
            key={p.props.id}
            center={p.centro}
            radius={sel ? 9 : 6}
            eventHandlers={handlers}
            pathOptions={{
              color: sel ? '#0b0b0b' : '#ffffff',
              weight: 2,
              fillColor: relleno,
              fillOpacity: v === null ? 0.45 : 1,
            }}
          >
            {tip}
          </CircleMarker>
        )
      })}
    </>
  )
}

export default function ParcelMap({
  parcelas,
  colorPor = 'pred',
  seleccionada,
  onSelect,
  className = 'h-[460px]',
  enfocarSeleccion = false,
}: {
  parcelas: Parcela[]
  colorPor?: ColorPor
  seleccionada?: string
  onSelect?: (id: string) => void
  className?: string
  enfocarSeleccion?: boolean
}) {
  const { porId } = useDatos()
  const enfocar = enfocarSeleccion && seleccionada ? porId.get(seleccionada) : undefined
  const inicial = useMemo(() => latLngBounds(parcelas.map((p) => p.centro)), []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`overflow-hidden rounded-xl border border-line ${className}`}>
      <MapContainer bounds={inicial} boundsOptions={{ padding: [24, 24] }} className="h-full w-full" scrollWheelZoom>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Mapa">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satélite">
            <TileLayer
              attribution="Imágenes &copy; Esri, Maxar, Earthstar Geographics"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        <Capa parcelas={parcelas} colorPor={colorPor} seleccionada={seleccionada} onSelect={onSelect} />
        <AjustarVista parcelas={parcelas} enfocar={enfocar} />
      </MapContainer>
    </div>
  )
}

/** Leyenda de clases (rampa secuencial) + "sin dato". */
export function LeyendaMapa({ colorPor }: { colorPor: ColorPor }) {
  const { clases } = useDatos()
  const etiquetas = clases.colores.map((_, i) => {
    const lo = i === 0 ? null : clases.cortes[i - 1]
    const hi = i === clases.colores.length - 1 ? null : clases.cortes[i]
    if (lo === null && hi !== null) return `< ${hi}`
    if (hi === null && lo !== null) return `≥ ${lo}`
    return `${lo}–${hi}`
  })
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
      <span className="font-medium text-ink">
        {colorPor === 'real' ? 'Rendimiento reportado' : 'Rendimiento estimado'} (t/ha)
      </span>
      <span className="inline-flex flex-wrap">
        {clases.colores.map((c, i) => (
          <span key={c} className="flex min-w-10 flex-col items-stretch text-center" style={{ marginRight: 2 }}>
            <span className="h-3" style={{ background: c }} />
            <span className="tabular mt-0.5 whitespace-nowrap px-1">{etiquetas[i]}</span>
          </span>
        ))}
      </span>
      {colorPor === 'real' && (
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-4 opacity-50" style={{ background: SIN_DATO }} /> Por predecir (sin dato)
        </span>
      )}
    </div>
  )
}

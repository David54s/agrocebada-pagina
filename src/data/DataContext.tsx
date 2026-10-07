import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { z } from 'zod'
import { clasesRendimiento, type Clases } from '../lib/colors'
import {
  ESTADOS,
  describirError,
  modeloSchema,
  parcelasSchema,
  seriesSchema,
  validarCruzado,
  type Estado,
  type Geometria,
  type Modelo,
  type Observacion,
  type ParcelaProps,
  type Variable,
} from './schema'

export interface Parcela {
  props: ParcelaProps
  geometry: Geometria
  /** [lat, lon] para Leaflet. */
  centro: [number, number]
}

export interface Datos {
  parcelas: Parcela[]
  porId: Map<string, Parcela>
  modelo: Modelo
  variables: Map<string, Variable>
  /** Promedio del rendimiento estimado por estado (t/ha). */
  promedioEstado: Record<Estado, number>
  /** Promedio de cada variable por estado, para comparar una parcela con su región. */
  mediaVarEstado: Record<Estado, Record<string, number>>
  clases: Clases
}

export const urlDatos = (archivo: string) => `${import.meta.env.BASE_URL}data/${archivo}`

class ErrorDatos extends Error {
  detalles: string[]
  constructor(detalles: string[]) {
    super('Los datos no cumplen el contrato')
    this.detalles = detalles
  }
}

async function cargar<T>(archivo: string, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(urlDatos(archivo))
  if (!res.ok) throw new ErrorDatos([`${archivo}: no se encontró (HTTP ${res.status})`])
  let crudo: unknown
  try {
    crudo = await res.json()
  } catch {
    throw new ErrorDatos([`${archivo}: no es JSON válido`])
  }
  const r = schema.safeParse(crudo)
  if (!r.success) throw new ErrorDatos(describirError(archivo, r.error))
  return r.data
}

function centroide(g: Geometria): [number, number] {
  const anillo = g.type === 'Polygon' ? g.coordinates[0] : g.coordinates[0][0]
  const pts = anillo.slice(0, -1)
  const lon = pts.reduce((s, p) => s + p[0], 0) / pts.length
  const lat = pts.reduce((s, p) => s + p[1], 0) / pts.length
  return [lat, lon]
}

function promedio(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN
}

async function cargarTodo(): Promise<Datos> {
  const [geo, modelo] = await Promise.all([
    cargar('parcelas.geojson', parcelasSchema),
    cargar('modelo.json', modeloSchema),
  ])
  const cruzados = validarCruzado(geo, modelo)
  if (cruzados.length) throw new ErrorDatos(cruzados)

  const parcelas = geo.features.map((f) => ({
    props: f.properties,
    geometry: f.geometry,
    centro: centroide(f.geometry),
  }))
  const promedioEstado = {} as Record<Estado, number>
  const mediaVarEstado = {} as Record<Estado, Record<string, number>>
  for (const e of ESTADOS) {
    const sub = parcelas.filter((p) => p.props.estado === e)
    promedioEstado[e] = promedio(sub.map((p) => p.props.rendimiento_pred))
    mediaVarEstado[e] = Object.fromEntries(
      modelo.variables.map((v) => [
        v.nombre,
        promedio(sub.map((p) => p.props[v.nombre]).filter((x): x is number => typeof x === 'number')),
      ]),
    )
  }
  return {
    parcelas,
    porId: new Map(parcelas.map((p) => [p.props.id, p])),
    modelo,
    variables: new Map(modelo.variables.map((v) => [v.nombre, v])),
    promedioEstado,
    mediaVarEstado,
    clases: clasesRendimiento(parcelas.map((p) => p.props.rendimiento_pred)),
  }
}

const Ctx = createContext<Datos | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [datos, setDatos] = useState<Datos | null>(null)
  const [error, setError] = useState<string[] | null>(null)

  useEffect(() => {
    cargarTodo()
      .then(setDatos)
      .catch((e: unknown) => setError(e instanceof ErrorDatos ? e.detalles : [String(e)]))
  }, [])

  if (error)
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-xl border border-line bg-surface p-6">
          <h1 className="text-lg font-semibold">No se pudieron cargar los datos</h1>
          <p className="mt-1 text-sm text-ink-2">
            Revisa los archivos de <code>public/data/</code> contra <code>docs/CONTRATO_DATOS.md</code>, o
            ejecuta <code>npm run validate</code>.
          </p>
          <ul className="mt-4 space-y-1 font-mono text-xs text-[var(--critical-text)]">
            {error.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      </div>
    )
  if (!datos)
    return (
      <div className="grid min-h-screen place-items-center text-sm text-ink-2" role="status">
        Cargando datos…
      </div>
    )
  return <Ctx.Provider value={datos}>{children}</Ctx.Provider>
}

export function useDatos(): Datos {
  const d = useContext(Ctx)
  if (!d) throw new Error('useDatos fuera de DataProvider')
  return d
}

// ---------- series temporales: se cargan solo cuando se abre una ficha ----------
let seriesPromesa: Promise<Record<string, Observacion[]>> | null = null

export function useSerie(id: string) {
  const [estado, setEstado] = useState<{ id: string; obs?: Observacion[]; error?: string }>({ id })

  useEffect(() => {
    seriesPromesa ??= cargar('series.json', seriesSchema)
    let vigente = true
    seriesPromesa
      .then((s) => vigente && setEstado({ id, obs: s[id] ?? [] }))
      .catch((e: unknown) => {
        seriesPromesa = null
        if (vigente) setEstado({ id, error: e instanceof ErrorDatos ? e.detalles.join('; ') : String(e) })
      })
    return () => {
      vigente = false
    }
  }, [id])

  return estado.id === id ? estado : { id }
}

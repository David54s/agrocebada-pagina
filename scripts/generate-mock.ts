/**
 * Genera datos de DEMOSTRACIÓN que cumplen el contrato de datos (src/data/schema.ts).
 * Uso: npm run mock
 *
 * - 197 parcelas en zonas cebaderas de Hidalgo, Tlaxcala y Puebla (coordenadas aproximadas).
 * - Partición 70/30 estratificada por estado (como la de FIRA).
 * - Ajusta una regresión ridge real con validación cruzada agrupada por municipio, así que las
 *   métricas, importancias, combinaciones y el simulador son coherentes entre sí.
 * Cuando el equipo de modelación entregue los archivos reales, reemplazan a estos en public/data/.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  modeloSchema,
  parcelasSchema,
  seriesSchema,
  validarCruzado,
  type Estado,
  type Modelo,
  type Observacion,
} from '../src/data/schema.ts'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data')

// ---------- azar reproducible ----------
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260927)
const unif = (a: number, b: number) => a + (b - a) * rand()
const normal = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const r = (v: number, d = 3) => Number(v.toFixed(d))

// ---------- geografía ----------
interface Zona {
  estado: Estado
  municipio: string
  lat: number
  lon: number
  elev: number
  lluvia: number
  n: number
}
const ZONAS: Zona[] = [
  { estado: 'Hidalgo', municipio: 'Apan', lat: 19.71, lon: -98.45, elev: 2490, lluvia: 560, n: 22 },
  { estado: 'Hidalgo', municipio: 'Almoloya', lat: 19.7, lon: -98.38, elev: 2560, lluvia: 540, n: 18 },
  { estado: 'Hidalgo', municipio: 'Emiliano Zapata', lat: 19.65, lon: -98.55, elev: 2470, lluvia: 520, n: 17 },
  { estado: 'Hidalgo', municipio: 'Tepeapulco', lat: 19.79, lon: -98.55, elev: 2440, lluvia: 500, n: 18 },
  { estado: 'Tlaxcala', municipio: 'Huamantla', lat: 19.31, lon: -97.92, elev: 2520, lluvia: 520, n: 20 },
  { estado: 'Tlaxcala', municipio: 'Calpulalpan', lat: 19.59, lon: -98.57, elev: 2590, lluvia: 580, n: 18 },
  { estado: 'Tlaxcala', municipio: 'Tlaxco', lat: 19.61, lon: -98.12, elev: 2600, lluvia: 600, n: 17 },
  { estado: 'Tlaxcala', municipio: 'Españita', lat: 19.46, lon: -98.42, elev: 2550, lluvia: 560, n: 15 },
  { estado: 'Puebla', municipio: 'Libres', lat: 19.46, lon: -97.69, elev: 2380, lluvia: 470, n: 15 },
  { estado: 'Puebla', municipio: 'Cuyoaco', lat: 19.6, lon: -97.62, elev: 2420, lluvia: 450, n: 13 },
  { estado: 'Puebla', municipio: 'San Salvador el Seco', lat: 19.13, lon: -97.64, elev: 2400, lluvia: 430, n: 12 },
  { estado: 'Puebla', municipio: 'Chalchicomula de Sesma', lat: 18.99, lon: -97.45, elev: 2510, lluvia: 490, n: 12 },
]

function rectangulo(lat: number, lon: number, ha: number): number[][] {
  const area = ha * 10_000
  const aspecto = unif(1.4, 3)
  const ancho = Math.sqrt(area / aspecto)
  const largo = ancho * aspecto
  const ang = unif(0, Math.PI)
  const mLat = 111_320
  const mLon = 111_320 * Math.cos((lat * Math.PI) / 180)
  const esquinas = [
    [-largo / 2, -ancho / 2],
    [largo / 2, -ancho / 2],
    [largo / 2, ancho / 2],
    [-largo / 2, ancho / 2],
  ].map(([x, y]) => {
    const rx = x * Math.cos(ang) - y * Math.sin(ang)
    const ry = x * Math.sin(ang) + y * Math.cos(ang)
    return [r(lon + rx / mLon, 6), r(lat + ry / mLat, 6)]
  })
  return [...esquinas, esquinas[0]]
}

// ---------- parcelas sintéticas ----------
const VARIABLES = [
  'ndvi_max',
  'evi_max',
  'ndre_max',
  'precip_total',
  'temp_media',
  'elevacion',
  'pendiente',
] as const
type Var = (typeof VARIABLES)[number]

interface Parcela {
  id: string
  zona: Zona
  superficie_ha: number
  geom: number[][]
  x: Record<Var, number>
  y: number
  conjunto: 'entrenamiento' | 'prediccion'
}

const parcelas: Parcela[] = []
let consecutivo = 1
for (const zona of ZONAS) {
  for (let i = 0; i < zona.n; i++) {
    const lat = zona.lat + normal() * 0.025
    const lon = zona.lon + normal() * 0.03
    const ha = r(clamp(Math.exp(normal() * 0.6 + 1.6), 1, 25), 2)
    const calidad = normal() // manejo / suelo, no observado directamente
    const precip = zona.lluvia + normal() * 55
    const elev = zona.elev + normal() * 45
    const pend = clamp(Math.abs(normal()) * 4 + unif(0, 2), 0.2, 15)
    const temp = 26.5 - elev * 0.0047 + normal() * 0.35
    const zP = (precip - 520) / 60
    const ndvi = clamp(0.66 + 0.06 * calidad + 0.025 * zP + normal() * 0.025, 0.35, 0.92)
    const evi = clamp(ndvi * 0.68 + normal() * 0.02, 0.2, 0.75)
    const ndre = clamp(ndvi * 0.52 + 0.015 * calidad + normal() * 0.018, 0.15, 0.6)
    const y = clamp(
      3.0 + 0.5 * calidad + 0.32 * zP - 0.05 * (pend - 3) - 0.18 * (temp - 14.8) + normal() * 0.38,
      1.1,
      5.8,
    )
    parcelas.push({
      id: `P${String(consecutivo++).padStart(3, '0')}`,
      zona,
      superficie_ha: ha,
      geom: rectangulo(lat, lon, ha),
      x: {
        ndvi_max: r(ndvi),
        evi_max: r(evi),
        ndre_max: r(ndre),
        precip_total: r(precip, 1),
        temp_media: r(temp, 2),
        elevacion: Math.round(elev),
        pendiente: r(pend, 2),
      },
      y: r(y, 2),
      conjunto: 'entrenamiento',
    })
  }
}

// Partición 70/30 estratificada por estado: 59 parcelas a predecir, como en el reto.
const N_PREDICCION: Record<Estado, number> = { Hidalgo: 22, Tlaxcala: 21, Puebla: 16 }
for (const estado of ['Hidalgo', 'Tlaxcala', 'Puebla'] as const) {
  const delEstado = parcelas.filter((p) => p.zona.estado === estado)
  const nPred = N_PREDICCION[estado]
  const barajadas = [...delEstado].sort(() => rand() - 0.5)
  barajadas.slice(0, nPred).forEach((p) => (p.conjunto = 'prediccion'))
}

// ---------- ridge con estandarización ----------
interface Ajuste {
  vars: Var[]
  intercepto: number
  coef: number[]
  media: number[]
  std: number[]
}

function resolver(A: number[][], b: number[]): number[] {
  const n = b.length
  const M = A.map((fila, i) => [...fila, b[i]])
  for (let c = 0; c < n; c++) {
    let piv = c
    for (let f = c + 1; f < n; f++) if (Math.abs(M[f][c]) > Math.abs(M[piv][c])) piv = f
    ;[M[c], M[piv]] = [M[piv], M[c]]
    for (let f = 0; f < n; f++) {
      if (f === c) continue
      const k = M[f][c] / M[c][c]
      for (let j = c; j <= n; j++) M[f][j] -= k * M[c][j]
    }
  }
  return M.map((fila, i) => fila[n] / fila[i])
}

function ajustar(datos: Parcela[], vars: Var[], lambda = 2): Ajuste {
  const n = datos.length
  const media = vars.map((v) => datos.reduce((s, p) => s + p.x[v], 0) / n)
  const std = vars.map(
    (v, j) => Math.sqrt(datos.reduce((s, p) => s + (p.x[v] - media[j]) ** 2, 0) / (n - 1)) || 1,
  )
  const Z = datos.map((p) => vars.map((v, j) => (p.x[v] - media[j]) / std[j]))
  const yMedia = datos.reduce((s, p) => s + p.y, 0) / n
  const k = vars.length
  const A = Array.from({ length: k }, (_, a) =>
    Array.from({ length: k }, (_, b) => Z.reduce((s, z) => s + z[a] * z[b], 0) + (a === b ? lambda : 0)),
  )
  const b = Array.from({ length: k }, (_, a) => Z.reduce((s, z, i) => s + z[a] * (datos[i].y - yMedia), 0))
  return { vars, intercepto: yMedia, coef: resolver(A, b), media, std }
}

const predecir = (m: Ajuste, p: Parcela) =>
  Math.max(0, m.vars.reduce((s, v, j) => s + (m.coef[j] * (p.x[v] - m.media[j])) / m.std[j], m.intercepto))

function metricas(pares: { y: number; yhat: number }[]) {
  const n = pares.length
  const yMedia = pares.reduce((s, p) => s + p.y, 0) / n
  const sse = pares.reduce((s, p) => s + (p.y - p.yhat) ** 2, 0)
  const sst = pares.reduce((s, p) => s + (p.y - yMedia) ** 2, 0)
  return {
    rmse: r(Math.sqrt(sse / n)),
    mae: r(pares.reduce((s, p) => s + Math.abs(p.y - p.yhat), 0) / n),
    r2: r(1 - sse / sst),
  }
}

/** Validación cruzada dejando fuera un municipio a la vez (CV espacial). */
function cvEspacial(datos: Parcela[], vars: Var[]) {
  const oof = new Map<string, number>()
  for (const zona of ZONAS) {
    const prueba = datos.filter((p) => p.zona === zona)
    if (!prueba.length) continue
    const m = ajustar(
      datos.filter((p) => p.zona !== zona),
      vars,
    )
    for (const p of prueba) oof.set(p.id, predecir(m, p))
  }
  return oof
}

const entrenamiento = parcelas.filter((p) => p.conjunto === 'entrenamiento')
const todas = [...VARIABLES]
const final = ajustar(entrenamiento, todas)
const oof = cvEspacial(entrenamiento, todas)
const pares = entrenamiento.map((p) => ({ y: p.y, yhat: oof.get(p.id)!, estado: p.zona.estado }))
const global = metricas(pares)
const z80 = 1.2816

// ---------- parcelas.geojson ----------
const geojson = {
  type: 'FeatureCollection',
  features: parcelas.map((p) => {
    const pred = predecir(final, p)
    const esEntr = p.conjunto === 'entrenamiento'
    return {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [p.geom] },
      properties: {
        ID_POLIGONO: p.id,
        estado: p.zona.estado,
        municipio: p.zona.municipio,
        superficie_ha: p.superficie_ha,
        conjunto: p.conjunto,
        rendimiento_real: esEntr ? p.y : null,
        rendimiento_pred: r(pred, 2),
        pred_lo: r(Math.max(0, pred - z80 * global.rmse), 2),
        pred_hi: r(pred + z80 * global.rmse, 2),
        prediccion_cv: esEntr ? r(oof.get(p.id)!, 2) : null,
        ...p.x,
      },
    }
  }),
}

// ---------- series.json (ciclo primavera-verano 2025, temporal) ----------
const series: Record<string, Observacion[]> = {}
const inicio = Date.UTC(2025, 5, 1)
const dia = 86_400_000
for (const p of parcelas) {
  const pico = 85 + normal() * 8 // días desde el 1 de junio
  const ancho = 34 + normal() * 4
  const obs: Observacion[] = []
  const agregar = (d: number, fuente: string, indices: string[]) => {
    const fecha = new Date(inicio + d * dia).toISOString().slice(0, 10)
    const nubosidad = rand() < 0.55 ? 0 : Math.round(unif(5, 85))
    const curva = 0.17 + (p.x.ndvi_max - 0.17) * Math.exp(-(((d - pico) / ancho) ** 2))
    const castigo = nubosidad > 40 ? unif(0.1, 0.35) * (nubosidad / 100) : 0
    for (const indice of indices) {
      const escala = indice === 'NDVI' ? 1 : indice === 'EVI' ? p.x.evi_max / p.x.ndvi_max : p.x.ndre_max / p.x.ndvi_max
      obs.push({ fecha, indice, valor: r(curva * escala - castigo + normal() * 0.012), nubosidad, fuente })
    }
  }
  for (let d = 0; d <= 160; d += 10) agregar(d, 'Sentinel-2', ['NDVI', 'EVI', 'NDRE'])
  for (let d = 3; d <= 160; d += 16) agregar(d, 'Landsat 8/9', ['NDVI'])
  series[p.id] = obs.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

// ---------- modelo.json ----------
const GRUPOS_VAR: Record<string, Var[]> = {
  'Solo índices de vegetación': ['ndvi_max', 'evi_max', 'ndre_max'],
  'Solo clima': ['precip_total', 'temp_media'],
  'Solo geofísicas (DEM)': ['elevacion', 'pendiente'],
  'NDVI + precipitación': ['ndvi_max', 'precip_total'],
  'Índices + clima': ['ndvi_max', 'evi_max', 'ndre_max', 'precip_total', 'temp_media'],
  'Todas las variables': todas,
}
const combinaciones = Object.entries(GRUPOS_VAR).map(([nombre, vars]) => {
  const o = cvEspacial(entrenamiento, vars)
  const m = metricas(entrenamiento.map((p) => ({ y: p.y, yhat: o.get(p.id)! })))
  return { nombre, variables: vars, rmse: m.rmse, r2: m.r2 }
})

const absCoef = final.coef.map(Math.abs)
const sumaCoef = absCoef.reduce((a, b) => a + b, 0)

const modelo: Modelo = {
  nombre: 'Regresión ridge (DEMO)',
  version: '0.1.0-mock',
  generado: new Date().toISOString().slice(0, 10),
  es_mock: true,
  descripcion:
    'Datos sintéticos de demostración. Se reemplazarán por las salidas del modelo real del equipo.',
  intervalo: 'Intervalo de predicción al 80 %',
  variables: [
    { nombre: 'ndvi_max', etiqueta: 'NDVI máximo', unidad: '', grupo: 'indice', descripcion: 'Qué tan verde y vigoroso estuvo el cultivo en su mejor momento.' },
    { nombre: 'evi_max', etiqueta: 'EVI máximo', unidad: '', grupo: 'indice', descripcion: 'Vigor del cultivo, menos sensible al suelo desnudo y a la atmósfera.' },
    { nombre: 'ndre_max', etiqueta: 'NDRE máximo', unidad: '', grupo: 'indice', descripcion: 'Contenido de clorofila (nutrición) de la planta.' },
    { nombre: 'precip_total', etiqueta: 'Lluvia acumulada', unidad: 'mm', grupo: 'clima', descripcion: 'Lluvia total durante el ciclo (todas las parcelas son de temporal).' },
    { nombre: 'temp_media', etiqueta: 'Temperatura media', unidad: '°C', grupo: 'clima', descripcion: 'Temperatura promedio durante el ciclo.' },
    { nombre: 'elevacion', etiqueta: 'Elevación', unidad: 'm', grupo: 'geofisica', descripcion: 'Altura sobre el nivel del mar.' },
    { nombre: 'pendiente', etiqueta: 'Pendiente', unidad: '%', grupo: 'geofisica', descripcion: 'Inclinación del terreno.' },
  ],
  metricas: {
    ...global,
    validacion: 'Validación cruzada espacial: se deja fuera un municipio a la vez',
    por_estado: (['Hidalgo', 'Tlaxcala', 'Puebla'] as const).map((estado) => {
      const sub = pares.filter((p) => p.estado === estado)
      return { estado, n: sub.length, ...metricas(sub) }
    }),
  },
  importancias: final.vars
    .map((v, j) => ({ variable: v, importancia: r(absCoef[j] / sumaCoef) }))
    .sort((a, b) => b.importancia - a.importancia),
  combinaciones,
  simulador: {
    tipo: 'lineal',
    descripcion: 'En esta demostración el simulador es el mismo modelo ridge.',
    rmse: global.rmse,
    intercepto: r(final.intercepto, 4),
    variables: final.vars.map((v, j) => {
      const valores = parcelas.map((p) => p.x[v])
      return {
        nombre: v,
        coef: r(final.coef[j], 4),
        media: r(final.media[j], 4),
        std: r(final.std[j], 4),
        min: r(Math.min(...valores), 3),
        max: r(Math.max(...valores), 3),
      }
    }),
  },
  umbrales: { bajo: 2.5, alto: 3.5 },
}

// ---------- validar y escribir ----------
const g = parcelasSchema.parse(geojson)
seriesSchema.parse(series)
const m = modeloSchema.parse(modelo)
const cruzados = validarCruzado(g, m)
if (cruzados.length) throw new Error(cruzados.join('\n'))

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'parcelas.geojson'), JSON.stringify(geojson))
writeFileSync(join(OUT, 'series.json'), JSON.stringify(series))
writeFileSync(join(OUT, 'modelo.json'), JSON.stringify(modelo, null, 2))
const csv = ['ID_POLIGONO,rendimiento_pred']
for (const f of geojson.features)
  if (f.properties.conjunto === 'prediccion') csv.push(`${f.properties.ID_POLIGONO},${f.properties.rendimiento_pred}`)
writeFileSync(join(OUT, 'predicciones.csv'), csv.join('\n') + '\n')

console.log(
  `OK: ${parcelas.length} parcelas (${entrenamiento.length} entrenamiento / ${parcelas.length - entrenamiento.length} predicción)`,
)
console.log(`CV espacial → RMSE ${global.rmse} · MAE ${global.mae} · R² ${global.r2}`)
console.table(combinaciones.map(({ nombre, rmse, r2 }) => ({ nombre, rmse, r2 })))

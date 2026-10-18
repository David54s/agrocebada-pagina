/**
 * Contrato de datos entre el modelo (equipo de modelación) y la app.
 * Documentado para humanos en docs/CONTRATO_DATOS.md — si cambias algo aquí, actualiza ese archivo.
 */
import { z } from 'zod'

export const ESTADOS = ['Hidalgo', 'Tlaxcala', 'Puebla'] as const
export type Estado = (typeof ESTADOS)[number]

export const CONJUNTOS = ['entrenamiento', 'prediccion'] as const
export type Conjunto = (typeof CONJUNTOS)[number]

export const GRUPOS = ['indice', 'clima', 'geofisica', 'otra'] as const
export type Grupo = (typeof GRUPOS)[number]

const finito = z.number().refine(Number.isFinite, 'debe ser un número finito')
const posicion = z.tuple([finito, finito]).rest(finito)
const anillo = z.array(posicion).min(4)

const geometria = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Polygon'), coordinates: z.array(anillo).min(1) }),
  z.object({ type: z.literal('MultiPolygon'), coordinates: z.array(z.array(anillo).min(1)).min(1) }),
])

/** El identificador puede venir como `ID_POLIGONO` (nombre del shapefile de FIRA) o como `id`. */
export const CAMPOS_ID = ['ID_POLIGONO', 'id_poligono', 'id'] as const

function normalizarId(v: unknown): unknown {
  if (!v || typeof v !== 'object') return v
  const o = v as Record<string, unknown>
  const campo = CAMPOS_ID.find((c) => o[c] !== undefined && o[c] !== null)
  return campo ? { ...o, id: o[campo] } : v
}

/**
 * Propiedades de cada parcela. Además de los campos fijos, cada variable listada en
 * `modelo.json → variables` debe venir como propiedad numérica (ej. `ndvi_max: 0.71`).
 */
const parcelaPropsBase = z.looseObject({
  id: z
    .union([z.string(), z.number()], { error: 'falta el identificador (ID_POLIGONO o id)' })
    .transform((v) => String(v).trim())
    .refine((v) => v !== '', 'el ID_POLIGONO no puede estar vacío'),
  estado: z.enum(ESTADOS),
  municipio: z.string().default(''),
  superficie_ha: finito.positive(),
  conjunto: z.enum(CONJUNTOS),
  rendimiento_real: finito.nullable(),
  rendimiento_pred: finito,
  pred_lo: finito,
  pred_hi: finito,
  prediccion_cv: finito.nullable().default(null),
  /** Explicación en lenguaje llano de cómo se llegó al número (la escribe el exportador). */
  nota: z.string().optional(),
  /** Aporte (t/ha) de los factores que más pesaron en esta parcela (valores SHAP del modelo). */
  factores: z
    .array(z.object({ variable: z.string(), etiqueta: z.string(), aporte: finito }))
    .optional(),
})

export const parcelaPropsSchema = z.preprocess(normalizarId, parcelaPropsBase)

export const parcelasSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z
    .array(
      z.object({
        type: z.literal('Feature'),
        geometry: geometria,
        properties: parcelaPropsSchema,
      }),
    )
    .min(1),
})

export const observacionSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'formato YYYY-MM-DD'),
  indice: z.string().min(1),
  valor: finito,
  // FIRA: si la nubosidad viene vacía se interpreta como 0 %.
  nubosidad: finito.nullable().default(null).transform((v) => v ?? 0),
  fuente: z.string().default(''),
})

export const seriesSchema = z.record(z.string(), z.array(observacionSchema))

const metricasSchema = z.object({
  rmse: finito.nonnegative(),
  mae: finito.nonnegative(),
  r2: finito,
})

export const modeloSchema = z.object({
  nombre: z.string(),
  version: z.string(),
  generado: z.string(),
  es_mock: z.boolean().default(false),
  descripcion: z.string().default(''),
  intervalo: z.string().default('Intervalo de predicción'),
  variables: z
    .array(
      z.object({
        nombre: z.string().min(1),
        etiqueta: z.string().min(1),
        unidad: z.string().default(''),
        grupo: z.enum(GRUPOS),
        descripcion: z.string().default(''),
      }),
    )
    .min(1),
  metricas: metricasSchema.extend({
    validacion: z.string(),
    por_estado: z.array(metricasSchema.extend({ estado: z.enum(ESTADOS), n: z.number().int() })),
  }),
  importancias: z.array(z.object({ variable: z.string(), importancia: finito.nonnegative() })),
  combinaciones: z.array(
    z.object({ nombre: z.string(), variables: z.array(z.string()), rmse: finito.nonnegative(), r2: finito }),
  ),
  simulador: z.object({
    tipo: z.literal('lineal'),
    descripcion: z.string().default(''),
    rmse: finito.nonnegative().optional(),
    intercepto: finito,
    variables: z
      .array(
        z.object({
          nombre: z.string(),
          coef: finito,
          media: finito,
          std: finito.positive(),
          min: finito,
          max: finito,
        }),
      )
      .min(1),
  }),
  umbrales: z
    .object({ bajo: finito, alto: finito })
    .refine((u) => u.bajo < u.alto, 'umbrales.bajo debe ser menor que umbrales.alto'),
  /** Respuestas a las preguntas guía del reto, redactadas por el equipo de modelación. */
  preguntas_guia: z
    .object({
      indice: z.object({ respuesta: z.string(), detalle: z.string().default('') }),
      clima: z.object({ respuesta: z.string(), detalle: z.string().default('') }),
      combinacion: z.object({ respuesta: z.string(), detalle: z.string().default('') }),
    })
    .optional(),
})

export type ParcelaProps = z.infer<typeof parcelaPropsSchema>
export type ParcelasGeo = z.infer<typeof parcelasSchema>
export type Geometria = ParcelasGeo['features'][number]['geometry']
export type Observacion = z.infer<typeof observacionSchema>
export type Series = z.infer<typeof seriesSchema>
export type Modelo = z.infer<typeof modeloSchema>
export type Variable = Modelo['variables'][number]
export type Simulador = Modelo['simulador']

/** Revisiones que cruzan archivos (zod valida cada archivo por separado). */
export function validarCruzado(parcelas: ParcelasGeo, modelo: Modelo): string[] {
  const errores: string[] = []
  const nombres = new Set(modelo.variables.map((v) => v.nombre))
  const ids = new Set<string>()
  for (const f of parcelas.features) {
    const p = f.properties
    if (ids.has(p.id)) errores.push(`parcelas.geojson: id duplicado "${p.id}"`)
    ids.add(p.id)
    if (p.conjunto === 'entrenamiento' && p.rendimiento_real === null)
      errores.push(`parcelas.geojson: la parcela ${p.id} es de entrenamiento pero no trae rendimiento_real`)
  }
  for (const v of modelo.simulador.variables)
    if (!nombres.has(v.nombre)) errores.push(`modelo.json: simulador usa "${v.nombre}", que no está en variables`)
  for (const i of modelo.importancias)
    if (!nombres.has(i.variable)) errores.push(`modelo.json: importancia de "${i.variable}", que no está en variables`)
  return errores
}

/** Convierte un error de zod en líneas legibles: "archivo → ruta: mensaje". */
export function describirError(archivo: string, error: z.ZodError): string[] {
  return error.issues.slice(0, 12).map((i) => `${archivo} → ${i.path.join('.') || '(raíz)'}: ${i.message}`)
}

/**
 * Valida los archivos de public/data/ contra el contrato de datos.
 * Uso (después de copiar las salidas reales del modelo): npm run validate
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { z } from 'zod'
import {
  describirError,
  modeloSchema,
  parcelasSchema,
  seriesSchema,
  validarCruzado,
} from '../src/data/schema.ts'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data')

function revisar<T>(archivo: string, schema: z.ZodType<T>): T | null {
  let crudo: unknown
  try {
    crudo = JSON.parse(readFileSync(join(DIR, archivo), 'utf8'))
  } catch (e) {
    console.error(`✗ ${archivo}: no se pudo leer como JSON (${(e as Error).message})`)
    return null
  }
  const res = schema.safeParse(crudo)
  if (!res.success) {
    describirError(archivo, res.error).forEach((l) => console.error(`✗ ${l}`))
    return null
  }
  console.log(`✓ ${archivo}`)
  return res.data
}

const parcelas = revisar('parcelas.geojson', parcelasSchema)
const series = revisar('series.json', seriesSchema)
const modelo = revisar('modelo.json', modeloSchema)
let ok = Boolean(parcelas && series && modelo)

if (parcelas && modelo) {
  const errores = validarCruzado(parcelas, modelo)
  errores.forEach((e) => console.error(`✗ ${e}`))
  ok &&= errores.length === 0
  const n = parcelas.features.length
  const pred = parcelas.features.filter((f) => f.properties.conjunto === 'prediccion').length
  console.log(`  ${n} parcelas · ${n - pred} entrenamiento · ${pred} predicción`)
}
if (parcelas && series) {
  const sinSerie = parcelas.features.filter((f) => !series[f.properties.id]).length
  if (sinSerie) console.warn(`! ${sinSerie} parcelas no tienen serie temporal (la ficha lo indicará)`)
}
process.exit(ok ? 0 : 1)

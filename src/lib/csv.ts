import Papa from 'papaparse'
import type { Simulador } from '../data/schema'
import type { Entradas } from '../model/surrogate'

export interface FilaLote {
  id: string
  entradas: Entradas
}

export interface ResultadoLote {
  filas: FilaLote[]
  errores: string[]
}

/** Acepta coma o punto decimal (Excel en español exporta "3,25" con separador ";"). */
function aNumero(s: unknown): number {
  if (typeof s !== 'string' || s.trim() === '') return NaN
  return Number(s.trim().replace(',', '.'))
}

/** Lee un CSV con columna `ID_POLIGONO` o `id` (opcional) y una columna por variable del simulador. */
export function leerCsvLote(texto: string, sim: Simulador): ResultadoLote {
  const res = Papa.parse<Record<string, string>>(texto.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  })
  const errores: string[] = []
  const columnas = res.meta.fields ?? []
  const faltantes = sim.variables.map((v) => v.nombre).filter((n) => !columnas.includes(n))
  if (faltantes.length) return { filas: [], errores: [`Faltan columnas: ${faltantes.join(', ')}`] }

  const filas: FilaLote[] = []
  res.data.forEach((fila, i) => {
    const id = (fila.id_poligono ?? fila.id)?.trim() || `fila ${i + 1}`
    const entradas: Entradas = {}
    const malas: string[] = []
    for (const v of sim.variables) {
      const n = aNumero(fila[v.nombre])
      if (Number.isFinite(n)) entradas[v.nombre] = n
      else malas.push(v.nombre)
    }
    if (malas.length) errores.push(`${id}: valor no numérico en ${malas.join(', ')}`)
    else filas.push({ id, entradas })
  })
  return { filas, errores }
}

export function plantillaCsv(sim: Simulador): string {
  const cols = sim.variables.map((v) => v.nombre)
  const ejemplo = sim.variables.map((v) => String(Number(v.media.toFixed(3))))
  return Papa.unparse({ fields: ['ID_POLIGONO', ...cols], data: [['mi_parcela_1', ...ejemplo]] })
}

export function aCsv(filas: Record<string, string | number | null>[]): string {
  return Papa.unparse(filas)
}

export function descargar(nombre: string, contenido: string, tipo = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

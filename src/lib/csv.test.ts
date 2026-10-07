import { describe, expect, it } from 'vitest'
import type { Simulador } from '../data/schema'
import { leerCsvLote, plantillaCsv } from './csv'

const sim: Simulador = {
  tipo: 'lineal',
  descripcion: '',
  intercepto: 3,
  variables: [
    { nombre: 'ndvi_max', coef: 0.5, media: 0.6, std: 0.1, min: 0.3, max: 0.9 },
    { nombre: 'precip_total', coef: 0.2, media: 500, std: 50, min: 350, max: 650 },
  ],
}

describe('CSV por lote', () => {
  it('lee filas válidas', () => {
    const r = leerCsvLote('id,ndvi_max,precip_total\nA,0.7,520\nB,0.5,480', sim)
    expect(r.errores).toEqual([])
    expect(r.filas).toEqual([
      { id: 'A', entradas: { ndvi_max: 0.7, precip_total: 520 } },
      { id: 'B', entradas: { ndvi_max: 0.5, precip_total: 480 } },
    ])
  })

  it('acepta separador ; con coma decimal y encabezados en mayúsculas', () => {
    const r = leerCsvLote('ID;NDVI_MAX;PRECIP_TOTAL\nA;0,7;520,5', sim)
    expect(r.filas[0].entradas).toEqual({ ndvi_max: 0.7, precip_total: 520.5 })
  })

  it('reporta columnas faltantes', () => {
    const r = leerCsvLote('id,ndvi_max\nA,0.7', sim)
    expect(r.filas).toEqual([])
    expect(r.errores[0]).toContain('precip_total')
  })

  it('omite filas con valores no numéricos y sigue con las demás', () => {
    const r = leerCsvLote('id,ndvi_max,precip_total\nA,abc,520\nB,0.6,\nC,0.6,500', sim)
    expect(r.filas.map((f) => f.id)).toEqual(['C'])
    expect(r.errores).toHaveLength(2)
  })

  it('acepta la columna ID_POLIGONO', () => {
    const r = leerCsvLote('ID_POLIGONO,ndvi_max,precip_total\nT-9,0.7,520', sim)
    expect(r.filas[0].id).toBe('T-9')
  })

  it('sin columna id numera las filas', () => {
    const r = leerCsvLote('ndvi_max,precip_total\n0.7,520', sim)
    expect(r.filas[0].id).toBe('fila 1')
  })

  it('la plantilla se puede volver a leer', () => {
    const r = leerCsvLote(plantillaCsv(sim), sim)
    expect(r.errores).toEqual([])
    expect(r.filas).toHaveLength(1)
  })
})

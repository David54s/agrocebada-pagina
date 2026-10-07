import { describe, expect, it } from 'vitest'
import type { ParcelaProps, Simulador } from '../data/schema'
import { contribuciones, entradasDeParcela, entradasMedias, predecir } from './surrogate'

const sim: Simulador = {
  tipo: 'lineal',
  descripcion: '',
  intercepto: 3,
  variables: [
    { nombre: 'ndvi_max', coef: 0.5, media: 0.6, std: 0.1, min: 0.3, max: 0.9 },
    { nombre: 'precip_total', coef: 0.2, media: 500, std: 50, min: 350, max: 650 },
  ],
}

describe('modelo sustituto', () => {
  it('en la media predice el intercepto', () => {
    expect(predecir(sim, entradasMedias(sim))).toBeCloseTo(3)
  })

  it('coincide con el cálculo a mano', () => {
    // 3 + 0.5·(0.8−0.6)/0.1 + 0.2·(400−500)/50 = 3 + 1 − 0.4
    expect(predecir(sim, { ndvi_max: 0.8, precip_total: 400 })).toBeCloseTo(3.6)
  })

  it('las contribuciones suman la predicción menos el intercepto', () => {
    const x = { ndvi_max: 0.71, precip_total: 560 }
    const suma = contribuciones(sim, x).reduce((s, c) => s + c.aporte, 0)
    expect(suma).toBeCloseTo(predecir(sim, x) - sim.intercepto)
  })

  it('variables faltantes toman su media y la predicción nunca es negativa', () => {
    expect(predecir(sim, { ndvi_max: 0.6 })).toBeCloseTo(3)
    expect(predecir(sim, { ndvi_max: -5, precip_total: 0 })).toBe(0)
  })

  it('lee entradas de una parcela y devuelve null si falta una variable', () => {
    const base = { id: 'P1', estado: 'Hidalgo', municipio: 'Apan', superficie_ha: 3, conjunto: 'entrenamiento', rendimiento_real: 3, rendimiento_pred: 3, pred_lo: 2, pred_hi: 4, prediccion_cv: 3 } as ParcelaProps
    expect(entradasDeParcela(sim, { ...base, ndvi_max: 0.7, precip_total: 510 })).toEqual({ ndvi_max: 0.7, precip_total: 510 })
    expect(entradasDeParcela(sim, { ...base, ndvi_max: 0.7 })).toBeNull()
  })
})

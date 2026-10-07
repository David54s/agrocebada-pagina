/**
 * Modelo sustituto lineal que corre en el navegador.
 * pred = intercepto + Σ coef_i · (x_i − media_i) / std_i
 * Los coeficientes vienen de modelo.json → simulador (los exporta el equipo de modelación).
 */
import type { ParcelaProps, Simulador } from '../data/schema'

export type Entradas = Record<string, number>

export interface Contribucion {
  nombre: string
  valor: number
  /** Cuántas t/ha suma (o resta) esta variable respecto a una parcela promedio. */
  aporte: number
}

export function contribuciones(sim: Simulador, x: Entradas): Contribucion[] {
  return sim.variables.map((v) => {
    const valor = x[v.nombre] ?? v.media
    return { nombre: v.nombre, valor, aporte: (v.coef * (valor - v.media)) / v.std }
  })
}

/** Predicción en t/ha; nunca negativa. Variables ausentes toman su media. */
export function predecir(sim: Simulador, x: Entradas): number {
  const total = contribuciones(sim, x).reduce((s, c) => s + c.aporte, sim.intercepto)
  return Math.max(0, total)
}

export function entradasMedias(sim: Simulador): Entradas {
  return Object.fromEntries(sim.variables.map((v) => [v.nombre, v.media]))
}

/** Lee de una parcela los valores de las variables del simulador (null si falta alguna). */
export function entradasDeParcela(sim: Simulador, p: ParcelaProps): Entradas | null {
  const x: Entradas = {}
  for (const v of sim.variables) {
    const valor = p[v.nombre]
    if (typeof valor !== 'number' || !Number.isFinite(valor)) return null
    x[v.nombre] = valor
  }
  return x
}

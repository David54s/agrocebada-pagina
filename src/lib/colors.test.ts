import { describe, expect, it } from 'vitest'
import { clasesRendimiento, colorClase, nivel } from './colors'

describe('clases del mapa', () => {
  const valores = Array.from({ length: 100 }, (_, i) => 1.5 + i * 0.03)

  it('cortes ordenados, dentro del rango y un color más que cortes', () => {
    const c = clasesRendimiento(valores)
    expect(c.colores.length).toBe(c.cortes.length + 1)
    expect([...c.cortes].sort((a, b) => a - b)).toEqual(c.cortes)
    expect(c.cortes[0]).toBeGreaterThan(1.5)
  })

  it('el valor mínimo usa el primer color y el máximo el último', () => {
    const c = clasesRendimiento(valores)
    expect(colorClase(1.5, c)).toBe(c.colores[0])
    expect(colorClase(4.47, c)).toBe(c.colores.at(-1))
  })

  it('todos iguales → una sola clase', () => {
    const c = clasesRendimiento([3, 3, 3])
    expect(c.cortes).toEqual([])
    expect(c.colores).toHaveLength(1)
  })
})

describe('semáforo', () => {
  it('clasifica con los umbrales', () => {
    const u = { bajo: 2.5, alto: 3.5 }
    expect(nivel(2.4, u)).toBe('bajo')
    expect(nivel(2.5, u)).toBe('medio')
    expect(nivel(3.5, u)).toBe('alto')
  })
})

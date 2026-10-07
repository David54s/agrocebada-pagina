import type { Estado, Modelo } from '../data/schema'

/** Color fijo por estado (sigue a la entidad, nunca al orden ni al filtro). */
export const COLOR_ESTADO: Record<Estado, string> = {
  Hidalgo: 'var(--series-1)',
  Tlaxcala: 'var(--series-2)',
  Puebla: 'var(--series-3)',
}

/** Rampa secuencial azul (un solo tono, claro → oscuro) para el rendimiento en el mapa. */
const RAMPA = ['#b7d3f6', '#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281']

export interface Clases {
  cortes: number[] // límites internos, cortes.length = colores.length - 1
  colores: string[]
}

/**
 * Clases por cuantiles (cada color agrupa ~el mismo número de parcelas), con cortes
 * redondeados a 0.25 t/ha para que la leyenda sea legible.
 */
export function clasesRendimiento(valores: number[]): Clases {
  const orden = [...valores].sort((a, b) => a - b)
  const k = RAMPA.length
  const cortes = [
    ...new Set(
      Array.from({ length: k - 1 }, (_, i) => {
        const q = orden[Math.floor(((i + 1) / k) * (orden.length - 1))]
        return Math.round(q * 4) / 4
      }),
    ),
  ].filter((c) => c > orden[0] && c <= orden[orden.length - 1])
  const n = cortes.length + 1
  const colores = n === 1 ? [RAMPA[3]] : RAMPA.slice(k - n)
  return { cortes, colores }
}

export function colorClase(v: number, c: Clases): string {
  const i = c.cortes.findIndex((corte) => v < corte)
  return c.colores[i === -1 ? c.colores.length - 1 : i]
}

export type Nivel = 'bajo' | 'medio' | 'alto'

export function nivel(v: number, u: Modelo['umbrales']): Nivel {
  return v < u.bajo ? 'bajo' : v >= u.alto ? 'alto' : 'medio'
}

export const NIVEL_INFO: Record<Nivel, { etiqueta: string; color: string; icono: string; consejo: string }> = {
  bajo: {
    etiqueta: 'Rendimiento bajo',
    color: 'var(--critical)',
    icono: '▼',
    consejo:
      'Se espera una cosecha por debajo de lo común en la región. Conviene revisar la fertilización y el control de malezas, y considerar un seguro agrícola.',
  },
  medio: {
    etiqueta: 'Rendimiento medio',
    color: 'var(--warning)',
    icono: '●',
    consejo:
      'Se espera una cosecha dentro de lo normal para la región. Hay margen de mejora con un buen manejo de nutrientes y de la fecha de siembra.',
  },
  alto: {
    etiqueta: 'Rendimiento alto',
    color: 'var(--good)',
    icono: '▲',
    consejo:
      'Se espera una cosecha por encima de lo común. La parcela muestra buen vigor; es un buen perfil para planear la comercialización o el financiamiento.',
  },
}

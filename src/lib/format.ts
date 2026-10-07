const cache = new Map<number, Intl.NumberFormat>()

export function num(v: number, dec = 1): string {
  let f = cache.get(dec)
  if (!f) {
    f = new Intl.NumberFormat('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec })
    cache.set(dec, f)
  }
  return f.format(v)
}

export const tha = (v: number, dec = 2) => `${num(v, dec)} t/ha`

export function conUnidad(v: number, unidad: string): string {
  const dec = Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : unidad ? 2 : 3
  return unidad ? `${num(v, dec)} ${unidad}` : num(v, dec)
}

export function fechaCorta(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

export function signo(v: number, dec = 2): string {
  return `${v > 0 ? '+' : v < 0 ? '−' : '±'}${num(Math.abs(v), dec)}`
}

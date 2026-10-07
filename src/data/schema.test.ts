import { describe, expect, it } from 'vitest'
import { parcelaPropsSchema } from './schema'

const base = {
  estado: 'Tlaxcala',
  municipio: 'Huamantla',
  superficie_ha: 4,
  conjunto: 'prediccion',
  rendimiento_real: null,
  rendimiento_pred: 3.1,
  pred_lo: 2.5,
  pred_hi: 3.7,
}

describe('identificador de parcela', () => {
  it('acepta ID_POLIGONO (shapefile de FIRA)', () => {
    expect(parcelaPropsSchema.parse({ ...base, ID_POLIGONO: 'T-0042' }).id).toBe('T-0042')
  })
  it('acepta id numérico y lo convierte a texto', () => {
    expect(parcelaPropsSchema.parse({ ...base, id: 42 }).id).toBe('42')
  })
  it('falla con un mensaje claro si no hay identificador', () => {
    const r = parcelaPropsSchema.safeParse(base)
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toContain('ID_POLIGONO')
  })
})

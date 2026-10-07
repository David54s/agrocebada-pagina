import { describe, expect, it } from 'vitest'
import { buscarId } from './buscar'

const ids = ['P001', 'P007', 'P120', 'HGO_015']

describe('buscarId', () => {
  it('coincidencia exacta', () => expect(buscarId(ids, 'P007')).toBe('P007'))
  it('ignora espacios y mayúsculas', () => expect(buscarId(ids, '  p120 ')).toBe('P120'))
  it('acepta el número sin ceros ni prefijo', () => {
    expect(buscarId(ids, '7')).toBe('P007')
    expect(buscarId(ids, '015')).toBe('HGO_015')
  })
  it('no adivina si el número es ambiguo', () => expect(buscarId(['HGO_001', 'TLX_001'], '1')).toBeNull())
  it('devuelve null si no existe o está vacío', () => {
    expect(buscarId(ids, 'P999')).toBeNull()
    expect(buscarId(ids, '   ')).toBeNull()
  })
})

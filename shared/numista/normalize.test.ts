import { normalizeForSearch } from './normalize'

describe('normalizeForSearch', () => {
  test('quita acentos', () => {
    expect(normalizeForSearch('Perú')).toBe('peru')
    expect(normalizeForSearch('México')).toBe('mexico')
  })

  test('pasa a minúsculas', () => {
    expect(normalizeForSearch('CHILE')).toBe('chile')
  })

  test('recorta espacios', () => {
    expect(normalizeForSearch('  Chile  ')).toBe('chile')
  })

  test('un texto ya sin acentos ni mayúsculas se mantiene igual', () => {
    expect(normalizeForSearch('canada')).toBe('canada')
  })

  test('produce el mismo resultado con y sin acento para el mismo país', () => {
    expect(normalizeForSearch('peru')).toBe(normalizeForSearch('Perú'))
  })
})

import { extractKmNumber, extractCatalogueNumber, KM_CATALOGUE_ID } from './references'
import type { NumistaReference } from './types'
import typeFixture from '../../tests/fixtures/numista/type-420.json'

describe('extractKmNumber', () => {
  test('extrae el número KM de una ficha real', () => {
    expect(extractKmNumber(typeFixture.references)).toBe('2')
  })

  test('devuelve null cuando la moneda no está en el catálogo KM', () => {
    const refs: NumistaReference[] = [
      { catalogue: { id: 24, code: 'Schön' }, number: '2' },
    ]
    expect(extractKmNumber(refs)).toBeNull()
  })

  test('devuelve null cuando no hay referencias', () => {
    expect(extractKmNumber(undefined)).toBeNull()
    expect(extractKmNumber([])).toBeNull()
  })

  test('conserva los números con subvariante como texto', () => {
    const refs: NumistaReference[] = [
      { catalogue: { id: KM_CATALOGUE_ID, code: 'KM' }, number: '360.1' },
    ]
    expect(extractKmNumber(refs)).toBe('360.1')
  })
})

describe('extractCatalogueNumber', () => {
  test('extrae el número de cualquier catálogo por id', () => {
    expect(extractCatalogueNumber(typeFixture.references, 24)).toBe('2')
  })
})

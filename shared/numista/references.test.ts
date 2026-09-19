import {
  extractKmNumber,
  extractCatalogueNumber,
  kmSearchCandidates,
  preferredReference,
  formatReference,
  KM_CATALOGUE_ID,
  Y_CATALOGUE_ID,
} from './references'
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

describe('kmSearchCandidates', () => {
  test('prueba primero lo escrito y después la base, para el sufijo con punto', () => {
    // El 1 Colón de Costa Rica (N#7666) se referencia como KM# 186.2-186.4:
    // sólo el número tal cual lo alcanza. El 10 Pesos chileno es al revés,
    // su tipo es el 216. Por eso se intentan los dos.
    expect(kmSearchCandidates('186.2')).toEqual(['186.2', '186'])
    expect(kmSearchCandidates('216.1')).toEqual(['216.1', '216'])
  })

  test('un número sin sufijo tiene un único candidato', () => {
    expect(kmSearchCandidates('206')).toEqual(['206'])
  })

  test('el sufijo con letra no se recorta: es otro tipo en Krause', () => {
    expect(kmSearchCandidates('179a')).toEqual(['179a'])
    expect(kmSearchCandidates('206b')).toEqual(['206b'])
  })

  test('colapsa a la base cuando el punto mezcla dígito y letra', () => {
    expect(kmSearchCandidates('216.1a')).toEqual(['216.1a', '216'])
  })

  test('no recorta un punto que no va seguido de un dígito', () => {
    expect(kmSearchCandidates('216.')).toEqual(['216.'])
  })

  test('tolera espacios alrededor de lo que se escribió', () => {
    expect(kmSearchCandidates('  360.1 ')).toEqual(['360.1', '360'])
  })

  test('no se queda en vacío cuando lo escrito es sólo el sufijo', () => {
    expect(kmSearchCandidates('.1')).toEqual(['.1'])
  })
})

describe('preferredReference', () => {
  const km = (number: string): NumistaReference => ({ catalogue: { id: KM_CATALOGUE_ID, code: 'KM' }, number })
  const y = (number: string): NumistaReference => ({ catalogue: { id: Y_CATALOGUE_ID, code: 'Y' }, number })

  test('prefiere KM cuando la moneda está en los dos catálogos', () => {
    expect(preferredReference([y('42'), km('216')])).toEqual({ code: 'KM', number: '216' })
  })

  test('cae a Y# cuando no hay KM, como en Venezuela', () => {
    expect(preferredReference([y('42')])).toEqual({ code: 'Y', number: '42' })
  })

  test('un KM del tipo gana a un Y# de la emisión', () => {
    expect(preferredReference([y('42')], [km('216')])).toEqual({ code: 'KM', number: '216' })
  })

  test('dentro del mismo catálogo gana la primera lista', () => {
    expect(preferredReference([km('216.1')], [km('216')])).toEqual({ code: 'KM', number: '216.1' })
  })

  test('devuelve null sin referencias conocidas', () => {
    expect(preferredReference(undefined, null, [])).toBeNull()
  })
})

describe('formatReference', () => {
  test('antepone el código del catálogo', () => {
    expect(formatReference({ code: 'KM', number: '179a' })).toBe('KM #179a')
    expect(formatReference({ code: 'Y', number: '42' })).toBe('Y #42')
  })
})

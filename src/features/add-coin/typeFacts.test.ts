import { typeFacts, typeYears, issueLabel } from './typeFacts'

describe('typeFacts', () => {
  test('muestra composición, diámetro y peso con decimales en español', () => {
    expect(
      typeFacts({
        id: 1,
        title: '½ Centésimo',
        composition: { text: 'Cobre-níquel' },
        size: 18,
        weight: 2.5,
      }),
    ).toEqual(['Cobre-níquel', '18 mm', '2,5 g'])
  })

  test('omite los datos que Numista no trae en vez de dejarlos vacíos', () => {
    expect(typeFacts({ id: 1, title: 'X', size: 18 })).toEqual(['18 mm'])
    expect(typeFacts({ id: 1, title: 'X' })).toEqual([])
  })
})

describe('typeYears', () => {
  test('muestra el rango cuando la acuñación abarca varios años', () => {
    expect(typeYears({ id: 1, title: 'X', min_year: 1962, max_year: 1963 })).toBe(
      '1962 – 1963',
    )
  })

  test('muestra un solo año cuando el rango es de un año', () => {
    expect(typeYears({ id: 1, title: 'X', min_year: 1962, max_year: 1962 })).toBe('1962')
    expect(typeYears({ id: 1, title: 'X', min_year: 1962 })).toBe('1962')
  })

  test('no inventa un rango cuando no hay año', () => {
    expect(typeYears({ id: 1, title: 'X' })).toBeNull()
  })
})

describe('issueLabel', () => {
  test('usa el Y# cuando la emisión no tiene KM', () => {
    expect(
      issueLabel({
        id: 1,
        year: 1945,
        references: [{ catalogue: { id: 9, code: 'Y' }, number: '29a' }],
      }),
    ).toBe('1945 · Y #29a')
  })

  test('encadena año, ceca, tirada, KM propio y comentario', () => {
    expect(
      issueLabel({
        id: 1,
        year: 1962,
        mint_letter: 'So',
        mintage: 3750000,
        comment: 'Proof',
        references: [{ catalogue: { id: 3, code: 'KM' }, number: '192a' }],
      }),
    ).toBe('1962 · Ceca So · Tirada 3.750.000 · KM #192a · Proof')
  })

  test('omite las partes ausentes', () => {
    expect(issueLabel({ id: 1, year: 1963, mintage: 8100000 })).toBe(
      '1963 · Tirada 8.100.000',
    )
  })

  test('indica cuando la emisión no tiene fecha', () => {
    expect(issueLabel({ id: 1, mint_letter: 'So' })).toBe('Sin fecha · Ceca So')
  })
})

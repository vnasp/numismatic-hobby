import {
  continentTallies,
  countryTallies,
  filterEntries,
  gradeTallies,
  decadeTallies,
  findDuplicate,
  sortEntries,
  materialTallies,
  unvaluedCount,
  valueTotals,
} from './collectionData'
import type { CollectionEntry } from './useCollection'

function entry(overrides: Partial<CollectionEntry> = {}): CollectionEntry {
  return {
    id: crypto.randomUUID(),
    numistaId: 420,
    numistaIssueId: 900,
    grade: 'vg',
    title: '1 Peso',
    issuerCode: 'chile',
    issuerName: 'Chile',
    continent: 'América',
    reference: { code: 'KM', number: '179a' },
    issueYear: 1955,
    mintLetter: null,
    thumbnail: null,
    thumbnailBack: null,
    material: null,
    diameterMm: null,
    weightG: null,
    value: null,
    isFavorite: false,
    ...overrides,
    // Por defecto el año gregoriano sigue al de la moneda: sólo los casos que
    // prueban otros calendarios los separan a propósito.
    gregorianYear:
      overrides.gregorianYear ??
      ('issueYear' in overrides ? overrides.issueYear! : 1955),
  }
}

describe('countryTallies', () => {
  test('cuenta las monedas por país, del más representado al menos', () => {
    const result = countryTallies([
      entry({ issuerName: 'Chile' }),
      entry({ issuerName: 'Chile' }),
      entry({ issuerName: 'Malvinas, Islas', issuerCode: 'malvinas' }),
    ])

    expect(result).toEqual([
      { code: 'chile', name: 'Chile', count: 2 },
      { code: 'malvinas', name: 'Malvinas, Islas', count: 1 },
    ])
  })

  test('desempata alfabéticamente para que la lista no baile entre renders', () => {
    const result = countryTallies([
      entry({ issuerName: 'Perú' }),
      entry({ issuerName: 'Argentina' }),
    ])

    expect(result.map((c) => c.name)).toEqual(['Argentina', 'Perú'])
  })

  test('agrupa aparte las monedas sin país en vez de perderlas', () => {
    const result = countryTallies([entry({ issuerName: null })])
    expect(result).toEqual([{ code: 'chile', name: 'Sin país', count: 1 }])
  })
})

describe('filterEntries', () => {
  const entries = [
    entry({ title: '1 Peso', issuerName: 'Chile', reference: { code: 'KM', number: '179a' }, issueYear: 1955 }),
    entry({ title: '2 Pence', issuerName: 'Malvinas, Islas', reference: { code: 'Y', number: '131' }, issueYear: 2004 }),
  ]

  test('sin texto ni país devuelve todo', () => {
    expect(filterEntries(entries, { query: '', country: null })).toHaveLength(2)
  })

  test('busca por título', () => {
    const result = filterEntries(entries, { query: 'pence', country: null })
    expect(result.map((e) => e.title)).toEqual(['2 Pence'])
  })

  test('busca por número KM', () => {
    const result = filterEntries(entries, { query: '179a', country: null })
    expect(result.map((e) => e.title)).toEqual(['1 Peso'])
  })

  test('busca por número Y#', () => {
    const result = filterEntries(entries, { query: 'y #131', country: null })
    expect(result.map((e) => e.title)).toEqual(['2 Pence'])
  })

  test('busca por año', () => {
    const result = filterEntries(entries, { query: '2004', country: null })
    expect(result.map((e) => e.title)).toEqual(['2 Pence'])
  })

  test('ignora acentos y mayúsculas', () => {
    const conAcento = [entry({ title: 'Medio Cóndor', issuerName: 'Chile' })]
    expect(filterEntries(conAcento, { query: 'CONDOR', country: null })).toHaveLength(1)
  })

  test('filtra por país', () => {
    const result = filterEntries(entries, { query: '', country: 'Chile' })
    expect(result.map((e) => e.title)).toEqual(['1 Peso'])
  })

  test('combina texto y país', () => {
    expect(filterEntries(entries, { query: 'pence', country: 'Chile' })).toHaveLength(0)
  })
})

describe('gradeTallies', () => {
  test('respeta el orden de la escala de Numista, no el de aparición', () => {
    const result = gradeTallies([
      entry({ grade: 'unc' }),
      entry({ grade: 'g' }),
      entry({ grade: 'unc' }),
    ])

    expect(result.map((t) => t.count)).toEqual([1, 2])
    expect(result[0].label).toMatch(/^G —/)
    expect(result[1].label).toMatch(/^UNC —/)
  })

  test('cuenta aparte las monedas sin grado, al final', () => {
    const result = gradeTallies([entry({ grade: null }), entry({ grade: 'vf' })])
    expect(result.at(-1)).toEqual({ label: 'Sin especificar', count: 1 })
  })
})

describe('decadeTallies', () => {
  test('agrupa por década, de la más antigua a la más reciente', () => {
    const result = decadeTallies([
      entry({ issueYear: 2004 }),
      entry({ issueYear: 1955 }),
      entry({ issueYear: 1959 }),
    ])

    expect(result).toEqual([
      { label: '1950s', count: 2 },
      { label: '2000s', count: 1 },
    ])
  })

  test('cuenta aparte las monedas sin fecha, al final', () => {
    const result = decadeTallies([entry({ issueYear: null }), entry({ issueYear: 1981 })])
    expect(result.at(-1)).toEqual({ label: 'Sin fecha', count: 1 })
  })
})

describe('findDuplicate', () => {
  const enColeccion = [entry({ numistaId: 420, numistaIssueId: 900 })]

  test('reconoce el mismo tipo y la misma emisión', () => {
    expect(
      findDuplicate(enColeccion, { numistaId: 420, numistaIssueId: 900 }),
    ).toBe(enColeccion[0])
  })

  test('no confunde dos emisiones distintas del mismo tipo', () => {
    // Un ½ Centésimo de 1962 y otro de 1963 comparten el KM y son monedas
    // distintas: agregar la segunda debe estar permitido.
    expect(findDuplicate(enColeccion, { numistaId: 420, numistaIssueId: 901 })).toBeNull()
  })

  test('no confunde dos tipos distintos', () => {
    expect(findDuplicate(enColeccion, { numistaId: 421, numistaIssueId: 900 })).toBeNull()
  })

  test('dos ejemplares sin emisión identificada del mismo tipo sí son el mismo', () => {
    const sinEmision = [entry({ numistaId: 420, numistaIssueId: null })]
    expect(
      findDuplicate(sinEmision, { numistaId: 420, numistaIssueId: null }),
    ).toBe(sinEmision[0])
  })

  test('uno sin emisión no choca con otro que sí la tiene', () => {
    const sinEmision = [entry({ numistaId: 420, numistaIssueId: null })]
    expect(findDuplicate(sinEmision, { numistaId: 420, numistaIssueId: 900 })).toBeNull()
  })

  test('una colección vacía nunca tiene duplicados', () => {
    expect(findDuplicate([], { numistaId: 420, numistaIssueId: 900 })).toBeNull()
  })
})

describe('continentTallies', () => {
  test('ordena geográficamente y deja los sin continente al final', () => {
    const result = continentTallies([
      entry({ continent: 'Europa' }),
      entry({ continent: null }),
      entry({ continent: 'Europa' }),
      entry({ continent: 'América' }),
    ])
    expect(result).toEqual([
      { label: 'América', count: 1 },
      { label: 'Europa', count: 2 },
      { label: 'Sin continente', count: 1 },
    ])
  })
})

describe('filterEntries por continente', () => {
  const entries = [
    entry({ title: '1 Peso', continent: 'América' }),
    entry({ title: '1 Euro', issuerName: 'España', continent: 'Europa' }),
    entry({ title: 'Ficha', issuerName: 'Groenlandia', continent: null }),
  ]

  test('deja sólo las del continente elegido', () => {
    const result = filterEntries(entries, { query: '', country: null, continent: 'Europa' })
    expect(result.map((e) => e.title)).toEqual(['1 Euro'])
  })

  test('filtra las que no tienen continente asignado', () => {
    const result = filterEntries(entries, { query: '', country: null, continent: 'Sin continente' })
    expect(result.map((e) => e.title)).toEqual(['Ficha'])
  })
})

describe('sortEntries', () => {
  const km = (number: string) => ({ code: 'KM' as const, number })
  const entries = [
    entry({ title: 'A', continent: 'Europa', issuerName: 'España', reference: km('10'), issueYear: 1990 }),
    entry({ title: 'B', continent: 'América', issuerName: 'Chile', reference: km('216.1'), issueYear: 1981 }),
    entry({ title: 'C', continent: 'América', issuerName: 'Chile', reference: km('179a'), issueYear: 1995 }),
    entry({ title: 'D', continent: 'América', issuerName: 'Argentina', reference: km('2'), issueYear: 1960 }),
    entry({ title: 'E', continent: null, issuerName: 'Groenlandia', reference: null, issueYear: null }),
    entry({ title: 'F', continent: 'América', issuerName: 'Chile', reference: km('179'), issueYear: 1970 }),
    entry({ title: 'G', continent: 'América', issuerName: 'Chile', reference: null, issueYear: 1975 }),
  ]

  test('recientes conserva el orden de llegada', () => {
    expect(sortEntries(entries, 'recientes').map((e) => e.title)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
  })

  test('por KM: continente, país y número en orden natural, sin KM al final', () => {
    expect(sortEntries(entries, 'km').map((e) => e.title)).toEqual(['D', 'F', 'C', 'B', 'G', 'A', 'E'])
  })

  test('por año: continente, país y año', () => {
    expect(sortEntries(entries, 'anio').map((e) => e.title)).toEqual(['D', 'F', 'G', 'B', 'C', 'A', 'E'])
  })

  test('KM antes que Y# dentro del mismo país', () => {
    const result = sortEntries(
      [
        entry({ title: 'Y', issuerName: 'Venezuela', reference: { code: 'Y', number: '1' } }),
        entry({ title: 'K', issuerName: 'Venezuela', reference: km('50') }),
      ],
      'km',
    )
    expect(result.map((e) => e.title)).toEqual(['K', 'Y'])
  })

  test('no modifica la lista original', () => {
    const copy = [...entries]
    sortEntries(entries, 'km')
    expect(entries).toEqual(copy)
  })
})

describe('sortEntries por favoritas', () => {
  test('sube las marcadas y conserva el orden de llegada en cada grupo', () => {
    const entries = [
      entry({ title: 'A', isFavorite: false }),
      entry({ title: 'B', isFavorite: true }),
      entry({ title: 'C', isFavorite: false }),
      entry({ title: 'D', isFavorite: true }),
    ]

    expect(sortEntries(entries, 'favoritas').map((e) => e.title)).toEqual(['B', 'D', 'A', 'C'])
  })

  test('sin favoritas deja la colección tal cual', () => {
    const entries = [entry({ title: 'A' }), entry({ title: 'B' })]

    expect(sortEntries(entries, 'favoritas').map((e) => e.title)).toEqual(['A', 'B'])
  })
})

describe('valueTotals y unvaluedCount', () => {
  const valor = (amount: number, currency: string) => ({
    amount,
    currency,
    source: null,
    at: null,
  })

  test('suma por moneda y no mezcla divisas', () => {
    const result = valueTotals([
      entry({ value: valor(3500, 'CLP') }),
      entry({ value: valor(1200, 'CLP') }),
      entry({ value: valor(8, 'EUR') }),
      entry({ value: null }),
    ])

    expect(result).toEqual([
      { currency: 'CLP', total: 4700, count: 2 },
      { currency: 'EUR', total: 8, count: 1 },
    ])
  })

  test('sin valoraciones no hay totales', () => {
    expect(valueTotals([entry({ value: null })])).toEqual([])
  })

  test('cuenta las que están sin valorar', () => {
    const entries = [
      entry({ value: valor(3500, 'CLP') }),
      entry({ value: null }),
      entry({ value: null }),
    ]
    expect(unvaluedCount(entries)).toBe(2)
  })
})


describe('materialTallies', () => {
  test('cuenta por familia de limpieza, del más presente al menos', () => {
    const result = materialTallies([
      // El acero chapado se limpia como latón: la capa es lo que se toca.
      entry({ material: 'Acero chapado en latón' }),
      entry({ material: 'Latón de níquel' }),
      entry({ material: 'Acero inoxidable' }),
      entry({ material: 'Bronce de aluminio' }),
      entry({ material: null }),
    ])

    expect(result).toEqual([
      { label: 'Latón', count: 2 },
      { label: 'Acero y hierro', count: 1 },
      { label: 'Cobre y bronce', count: 1 },
      { label: 'Sin especificar', count: 1 },
    ])
  })
})

describe('decadeTallies con otros calendarios', () => {
  test('cuenta por el año gregoriano y no por el de la moneda', () => {
    const result = decadeTallies([
      // Israel 5745 y Egipto 1404 son las dos de los años ochenta.
      entry({ issueYear: 5745, gregorianYear: 1985 }),
      entry({ issueYear: 1404, gregorianYear: 1984 }),
      entry({ issueYear: 1955, gregorianYear: 1955 }),
    ])

    expect(result).toEqual([
      { label: '1950s', count: 1 },
      { label: '1980s', count: 2 },
    ])
  })
})

describe('sortEntries por año en otros calendarios', () => {
  test('ordena por el año gregoriano', () => {
    const result = sortEntries(
      [
        entry({ title: 'Israel', issuerName: 'Israel', issueYear: 5745, gregorianYear: 1985 }),
        entry({ title: 'Chile', issuerName: 'Israel', issueYear: 1955, gregorianYear: 1955 }),
      ],
      'anio',
    )

    expect(result.map((e) => e.title)).toEqual(['Chile', 'Israel'])
  })
})

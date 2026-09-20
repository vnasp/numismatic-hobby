import { applyStatsFilter, describeFilter, EMPTY_FILTER, UNGRADED } from './statsFilter'
import type { CollectionEntry } from '../collection/useCollection'

function entry(overrides: Partial<CollectionEntry> = {}): CollectionEntry {
  return {
    id: crypto.randomUUID(),
    numistaId: 1,
    numistaIssueId: null,
    grade: 'vf',
    title: '1 Peso',
    issuerCode: 'chili',
    issuerName: 'Chile',
    continent: 'América',
    reference: null,
    issueYear: 1955,
    gregorianYear: 1955,
    mintLetter: null,
    thumbnail: null,
    thumbnailBack: null,
    material: 'Cuproníquel',
    diameterMm: 24,
    weightG: null,
    value: null,
    isFavorite: false,
    ...overrides,
  }
}

test('cruza dos dimensiones a la vez: cuántas de América miden 25 mm', () => {
  const entries = [
    entry({ continent: 'América', diameterMm: 24 }), // entra en la ventana de 25
    entry({ continent: 'América', diameterMm: 25 }),
    entry({ continent: 'América', diameterMm: 30 }),
    entry({ continent: 'Europa', diameterMm: 24 }),
  ]

  const cruce = applyStatsFilter(entries, {
    ...EMPTY_FILTER,
    continent: 'América',
    carton: '25 mm',
  })

  expect(cruce).toHaveLength(2)
})

test('agrupa el tamaño con la misma regla que el gráfico: la ventana más chica en que entra', () => {
  const entries = [entry({ diameterMm: 20.1 }), entry({ diameterMm: 22.5 })]

  // Las dos caen en la ventana de 22,5: una por exceso sobre 20, la otra justa.
  expect(applyStatsFilter(entries, { ...EMPTY_FILTER, carton: '22,5 mm' })).toHaveLength(2)
})

test('el rango de años deja fuera las monedas sin fecha', () => {
  const entries = [
    entry({ gregorianYear: 1950 }),
    entry({ gregorianYear: 1990 }),
    entry({ gregorianYear: null }),
  ]

  // Sin año no hay forma honesta de decidir si cae dentro del rango.
  expect(applyStatsFilter(entries, { ...EMPTY_FILTER, fromYear: 1940, toYear: 1960 })).toHaveLength(1)
  expect(applyStatsFilter(entries, EMPTY_FILTER)).toHaveLength(3)
})

test('filtra por el año gregoriano y no por el que lleva la moneda', () => {
  // Una israelí fechada 5745 es de 1985 y tiene que caer en ese rango.
  const entries = [entry({ issueYear: 5745, gregorianYear: 1985 })]

  expect(applyStatsFilter(entries, { ...EMPTY_FILTER, fromYear: 1980, toYear: 1989 })).toHaveLength(1)
})

test('agrupa por familia de material, no por la composición exacta', () => {
  const entries = [
    entry({ material: 'Cuproníquel (75% Copper, 25% Nickel)' }),
    entry({ material: 'Níquel' }),
    entry({ material: 'Aluminio' }),
  ]

  expect(
    applyStatsFilter(entries, { ...EMPTY_FILTER, material: 'Cuproníquel y níquel' }),
  ).toHaveLength(2)
})

test('las monedas sin conservación anotada se pueden filtrar como grupo', () => {
  const entries = [entry({ grade: 'vf' }), entry({ grade: null })]

  expect(applyStatsFilter(entries, { ...EMPTY_FILTER, grade: UNGRADED })).toHaveLength(1)
})

test('las monedas sin país o sin continente se agrupan en vez de perderse', () => {
  const entries = [entry({ issuerName: null, continent: null })]

  expect(applyStatsFilter(entries, { ...EMPTY_FILTER, country: 'Sin país' })).toHaveLength(1)
  expect(applyStatsFilter(entries, { ...EMPTY_FILTER, continent: 'Sin continente' })).toHaveLength(1)
})

test('resume el filtro puesto para poder quitarlo de a uno', () => {
  const chips = describeFilter({
    ...EMPTY_FILTER,
    continent: 'América',
    grade: UNGRADED,
    fromYear: 1950,
    toYear: 1959,
  })

  expect(chips.map((chip) => chip.label)).toEqual([
    'América',
    'Sin conservación',
    '1950–1959',
  ])
})

import { collectionToCsv, csvFilename } from './collectionCsv'
import type { CollectionEntry } from '../collection/useCollection'

function entry(overrides: Partial<CollectionEntry> = {}): CollectionEntry {
  return {
    id: 'a',
    numistaId: 420,
    numistaIssueId: 77,
    grade: 'vf',
    title: '1 Peso',
    issuerCode: 'chili',
    issuerName: 'Chile',
    continent: 'América',
    reference: { code: 'KM', number: '179a' },
    issueYear: 1955,
    gregorianYear: 1955,
    mintLetter: 'So',
    thumbnail: null,
    thumbnailBack: null,
    material: 'Cuproníquel',
    diameterMm: 22.5,
    weightG: 4.5,
    value: { amount: 3500, currency: 'CLP', source: 'Numista', at: '2026-01-15T00:00:00Z' },
    isFavorite: true,
    ...overrides,
  }
}

function rows(csv: string) {
  return csv.replace('﻿', '').trimEnd().split('\r\n')
}

test('parte en punto y coma y escribe los decimales con coma', () => {
  // Con separador coma, "22,5" se partiría en dos celdas.
  const [, fila] = rows(collectionToCsv([entry()]))

  expect(fila.split(';')).toContain('22,5')
  expect(fila.split(';')).toContain('4,5')
})

test('lleva la marca de bytes para que Excel no rompa las tildes', () => {
  expect(collectionToCsv([entry()]).startsWith('﻿')).toBe(true)
})

test('entrecomilla lo que trae el separador y duplica las comillas de adentro', () => {
  const csv = collectionToCsv([entry({ title: '1 Peso; "conmemorativa"' })])

  expect(csv).toContain('"1 Peso; ""conmemorativa"""')
})

test('incluye la valoración, que es justamente lo que la vitrina no muestra', () => {
  const [encabezado, fila] = rows(collectionToCsv([entry()]))

  expect(encabezado).toContain('Valoración')
  expect(fila.split(';')).toContain('3500')
  expect(fila.split(';')).toContain('CLP')
  expect(fila.split(';')).toContain('2026-01-15')
})

test('deja la celda vacía donde no hay dato, en vez de escribir null', () => {
  const [, fila] = rows(
    collectionToCsv([
      entry({ value: null, weightG: null, diameterMm: null, grade: null, isFavorite: false }),
    ]),
  )

  expect(fila).not.toContain('null')
  expect(fila).not.toContain('undefined')
})

test('una fila por moneda, más la de encabezados', () => {
  expect(rows(collectionToCsv([entry(), entry(), entry()]))).toHaveLength(4)
})

test('el archivo lleva la fecha en el nombre', () => {
  expect(csvFilename(new Date('2026-09-20T12:00:00Z'))).toBe('coleccion-2026-09-20.csv')
})

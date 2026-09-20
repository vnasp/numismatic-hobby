import { squarify } from './treemapLayout'

const ITEMS = [
  { label: 'Chile', count: 120 },
  { label: 'Argentina', count: 60 },
  { label: 'Perú', count: 30 },
  { label: 'Brasil', count: 20 },
  { label: 'Uruguay', count: 5 },
  { label: 'Paraguay', count: 1 },
]

test('el área de cada baldosa es proporcional a su cantidad', () => {
  const cells = squarify(ITEMS, 600, 300)
  const total = ITEMS.reduce((sum, item) => sum + item.count, 0)

  for (const cell of cells) {
    const esperado = (cell.count / total) * 600 * 300
    expect(cell.w * cell.h).toBeCloseTo(esperado, 4)
  }
})

test('las baldosas llenan el rectángulo sin salirse', () => {
  const cells = squarify(ITEMS, 600, 300)

  for (const cell of cells) {
    expect(cell.x).toBeGreaterThanOrEqual(-0.001)
    expect(cell.y).toBeGreaterThanOrEqual(-0.001)
    expect(cell.x + cell.w).toBeLessThanOrEqual(600.001)
    expect(cell.y + cell.h).toBeLessThanOrEqual(300.001)
  }
})

test('las baldosas quedan razonablemente cuadradas y no en tiras', () => {
  // Es la razón de ser del algoritmo: un rectángulo de 200×4 no se compara
  // con uno de 30×26 aunque midan lo mismo.
  const cells = squarify(ITEMS, 600, 300)
  const grandes = cells.filter((cell) => cell.count >= 20)

  for (const cell of grandes) {
    expect(Math.max(cell.w / cell.h, cell.h / cell.w)).toBeLessThan(4)
  }
})

test('no dibuja las de cantidad cero y aguanta la lista vacía', () => {
  expect(squarify([{ label: 'Nada', count: 0 }], 100, 100)).toEqual([])
  expect(squarify([], 100, 100)).toEqual([])
})

test('con un solo país la baldosa es el rectángulo entero', () => {
  const [cell] = squarify([{ label: 'Chile', count: 7 }], 600, 300)

  expect(cell.w).toBeCloseTo(600)
  expect(cell.h).toBeCloseTo(300)
})

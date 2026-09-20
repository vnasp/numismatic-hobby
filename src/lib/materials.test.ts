import { materialFamily } from './materials'

// Los textos son los que trae Numista en la colección real.
test('la plata y el vellón van juntos', () => {
  expect(materialFamily('Plata 500')).toBe('Plata')
  expect(materialFamily('Plata 835 (Copper .165)')).toBe('Plata')
  expect(materialFamily('Vellón (plata 400)')).toBe('Plata')
})

test('el chapado manda sobre el núcleo: se limpia la capa', () => {
  expect(materialFamily('Acero chapado en cobre')).toBe('Cobre y bronce')
  expect(materialFamily('Hierro recubierto de cobre (90% Iron, 10% Copper)')).toBe('Cobre y bronce')
  expect(materialFamily('Zinc chapado en cobre')).toBe('Cobre y bronce')
  expect(materialFamily('Acero chapado en níquel')).toBe('Cuproníquel y níquel')
  expect(materialFamily('Acero recubierto de latón')).toBe('Latón')
  expect(materialFamily('Cobre recubierto de cuproníquel')).toBe('Cuproníquel y níquel')
})

test('el cuproníquel no se confunde con el cobre ni con el níquel', () => {
  expect(materialFamily('Cuproníquel (75% Copper, 25% Nickel)')).toBe('Cuproníquel y níquel')
  expect(materialFamily('Níquel (100%)')).toBe('Cuproníquel y níquel')
})

test('el bronce de aluminio es bronce, y el latón de níquel es latón', () => {
  expect(materialFamily('Bronce de aluminio (92% Copper, 6% Aluminium, 2% Nickel)')).toBe(
    'Cobre y bronce',
  )
  expect(materialFamily('Bronce de aluminio-níquel')).toBe('Cobre y bronce')
  expect(materialFamily('Latón de níquel (70% Copper, 18% Zinc, 12% Nickel)')).toBe('Latón')
  expect(materialFamily('Latón de aluminio (85% Copper, 14.5% Zinc, 0.5% Aluminium)')).toBe('Latón')
  expect(materialFamily('Latón de manganeso')).toBe('Latón')
})

test('el oro nórdico se limpia como latón', () => {
  expect(materialFamily('Oro nórdico (89% Copper, 5% Aluminium, 5% Zinc, 1% Tin)')).toBe('Latón')
})

test('el aluminio y el zinc quedan aparte, que son los más delicados', () => {
  expect(materialFamily('Aluminio (98.5% Aluminium, 1.5% Magnesium)')).toBe('Aluminio')
  expect(materialFamily('Zinc')).toBe('Zinc')
})

test('el acero y sus nombres comerciales van juntos', () => {
  expect(materialFamily('Acero inoxidable')).toBe('Acero y hierro')
  expect(materialFamily('Acmonital (81.75% Iron, 18.25% Chromium)')).toBe('Acero y hierro')
})

test('las bimetálicas se reconocen antes que sus metales', () => {
  expect(
    materialFamily(
      'Bimetálica: centro de níquel recubierto de latón de níquel y anillo de cuproníquel',
    ),
  ).toBe('Bimetálica')
  expect(materialFamily('Bimetálica: centro de acero inoxidable y anillo de acero chapado en bronce')).toBe(
    'Bimetálica',
  )
})

test('sin composición no hay familia', () => {
  expect(materialFamily(null)).toBeNull()
  expect(materialFamily('')).toBeNull()
})

test('un material desconocido cae en Otros, no se pierde', () => {
  expect(materialFamily('Porcelana')).toBe('Otros')
})

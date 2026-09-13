import { GRADES, gradeLabel } from './grades'

test('cubre los siete grados de la escala de Numista', () => {
  expect(GRADES.map((g) => g.code)).toEqual(['g', 'vg', 'f', 'vf', 'xf', 'au', 'unc'])
})

test('devuelve la etiqueta en español de un grado', () => {
  expect(gradeLabel('xf')).toBe('XF — Extraordinariamente bien conservada')
  expect(gradeLabel('unc')).toBe('UNC — Sin circular')
})

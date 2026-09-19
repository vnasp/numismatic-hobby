import { numistaTypeUrl } from './urls'

test('usa la url que entrega la API cuando viene en la respuesta del tipo', () => {
  expect(numistaTypeUrl({ id: 420, url: 'https://es.numista.com/420' })).toBe(
    'https://es.numista.com/420',
  )
})

test('arma la url en español cuando el resultado de búsqueda no la trae', () => {
  expect(numistaTypeUrl({ id: 420 })).toBe('https://es.numista.com/420')
})

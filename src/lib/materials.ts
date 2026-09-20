import { normalizeForSearch } from '../../shared/numista/normalize'

/**
 * Familia de limpieza de una moneda.
 *
 * Numista describe la composición con mucho detalle ("Cuproníquel (75%
 * Copper, 25% Nickel)", "Bronce de aluminio-níquel", "Acero chapado en
 * latón"), y para elegir una pasta de limpieza ese detalle estorba: lo que
 * importa es con qué metal estás en contacto y qué tan blando es.
 *
 * Las familias siguen ese criterio, no el químico:
 *
 * - **Plata** pide producto propio, y las de vellón se tratan igual.
 * - **Cobre y bronce** se oscurecen y aceptan pastas más fuertes.
 * - **Latón** incluye el oro nórdico y los latones de níquel, aluminio o
 *   manganeso: por fuera se comportan igual.
 * - **Cuproníquel y níquel** es el grupo más común en monedas modernas.
 * - **Aluminio** es blandísimo: cualquier abrasivo lo raya, así que conviene
 *   verlo aparte aunque sean pocas.
 * - **Acero y hierro** puede tener óxido, que es otro problema.
 * - **Zinc** se pica con los ácidos.
 * - **Bimetálicas** llevan dos metales en la misma pieza: se limpian con lo
 *   más suave de los dos.
 *
 * La regla más importante es la del chapado: en "Acero chapado en cobre" tú
 * limpias cobre, no acero. Por eso el recubrimiento manda sobre el núcleo.
 */
export type MaterialFamily =
  | 'Plata'
  | 'Cobre y bronce'
  | 'Latón'
  | 'Cuproníquel y níquel'
  | 'Aluminio'
  | 'Acero y hierro'
  | 'Zinc'
  | 'Bimetálica'
  | 'Otros'

/** El orden en que conviene leerlas: de lo más delicado a lo más resistente. */
export const MATERIAL_FAMILIES: MaterialFamily[] = [
  'Plata',
  'Cobre y bronce',
  'Latón',
  'Cuproníquel y níquel',
  'Aluminio',
  'Acero y hierro',
  'Zinc',
  'Bimetálica',
  'Otros',
]

/**
 * Las palabras que deciden, en orden: la primera que aparece gana.
 *
 * El orden resuelve las composiciones que nombran dos metales. "Bronce de
 * aluminio" es bronce por fuera, no aluminio; "latón de níquel" es latón; y
 * "cuproníquel" tiene que mirarse antes que "cobre" y que "níquel".
 */
const REGLAS: { palabras: string[]; familia: MaterialFamily }[] = [
  { palabras: ['plata', 'vellon', 'billon', 'silver'], familia: 'Plata' },
  { palabras: ['cuproniquel', 'cupro niquel'], familia: 'Cuproníquel y níquel' },
  { palabras: ['bronce', 'bronzital', 'cobre', 'copper'], familia: 'Cobre y bronce' },
  { palabras: ['laton', 'oro nordico', 'brass'], familia: 'Latón' },
  { palabras: ['niquel', 'nickel'], familia: 'Cuproníquel y níquel' },
  { palabras: ['aluminio', 'aluminium'], familia: 'Aluminio' },
  { palabras: ['acero', 'acmonital', 'hierro', 'steel', 'iron'], familia: 'Acero y hierro' },
  { palabras: ['zinc'], familia: 'Zinc' },
]

/** "Acero chapado en cobre" → "cobre": se limpia la capa, no el núcleo. */
const CHAPADO = /(?:chapad[oa] en|recubiert[oa] de|plated with|clad in)\s+(.+)$/

export function materialFamily(material: string | null | undefined): MaterialFamily | null {
  if (!material) return null

  // Sin el paréntesis del final, que sólo trae los porcentajes.
  const limpio = normalizeForSearch(material.replace(/\s*\([^)]*\)\s*$/, ''))
  if (!limpio) return null

  // Las bimetálicas se reconocen antes que nada: nombran los dos metales y
  // cualquier regla de palabra se quedaría con el primero que aparece.
  if (limpio.includes('bimetalica') || limpio.includes('bimetallic')) return 'Bimetálica'

  const capa = limpio.match(CHAPADO)
  const texto = capa ? capa[1] : limpio

  for (const { palabras, familia } of REGLAS) {
    if (palabras.some((palabra) => texto.includes(palabra))) return familia
  }

  // Si el recubrimiento no dijo nada conocido, se prueba con la composición
  // completa antes de rendirse.
  if (capa) {
    for (const { palabras, familia } of REGLAS) {
      if (palabras.some((palabra) => limpio.includes(palabra))) return familia
    }
  }

  return 'Otros'
}

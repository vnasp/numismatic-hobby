/**
 * Los colores de los gráficos.
 *
 * La app tiene un solo acento (el oro de la vitrina) y eso alcanza mientras
 * el color no tenga que decir nada: en un gráfico de magnitud el largo o el
 * área ya lleva el dato, y pintar cada barra de un tono distinto sólo repite
 * lo que se ve. Por eso casi todo acá es oro.
 *
 * Donde el color sí trabaja es cuando distingue identidades que no tienen
 * orden —los continentes, las familias de material—, y ahí hace falta una
 * paleta de verdad: tonos que se diferencien también para quien no distingue
 * el rojo del verde.
 *
 * Los valores de abajo no están elegidos a ojo. Pasaron el validador de
 * paletas (banda de luminosidad, piso de croma, separación bajo protanopia y
 * deuteranopia, y contraste contra el fondo de las tarjetas, #1a1714):
 *
 *   node scripts/validate_palette.js \
 *     "#b4842f,#2f9f86,#c06239,#4f92c4,#d4557f,#8f7fd0" \
 *     --mode dark --surface "#1a1714"
 *
 * El *orden* es parte del resultado y no es decorativo: lo que se comprobó es
 * que cada par vecino se distingue, incluido el par que cierra el anillo de
 * la dona (violeta junto a oro). Reordenarlos invalida la comprobación.
 */

/** Paleta de identidad, en el orden en que debe asignarse. */
export const SERIES = [
  '#b4842f', // oro
  '#2f9f86', // verdín
  '#c06239', // cobre
  '#4f92c4', // acero
  '#d4557f', // rosa
  '#8f7fd0', // peltre
] as const

/**
 * El color de "Otros" y de lo que no se pudo clasificar: gris neutro, nunca
 * un tono de la paleta. Un grupo que es un cajón de sastre no es una
 * identidad más.
 */
export const SERIES_OTHER = '#7a7167'

/** Cuántas identidades se pintan antes de plegar el resto en "Otros". */
export const SERIES_LIMIT = SERIES.length

/**
 * Rampa ordinal de oro, de la más apagada a la más viva, para las escalas
 * que sí tienen orden: la conservación (de G a UNC) y los tamaños de cartón.
 * Ahí el color acompaña al orden en vez de inventar identidades.
 *
 * Validada con `--ordinal`: luminosidad monótona, saltos de al menos 0,06 y
 * el extremo apagado todavía por sobre 2:1 contra el fondo.
 */
export const RAMP = [
  '#5e4526',
  '#7a5a2f',
  '#96733a',
  '#b08c46',
  '#c6a45c',
  '#d8b978',
  '#eed7a6',
] as const

/**
 * Un escalón de la rampa para el elemento `index` de `total`.
 *
 * Con menos elementos que escalones se reparte a lo largo de toda la rampa
 * en vez de usar los primeros: lo que importa es que se lea la progresión.
 */
export function rampStep(index: number, total: number): string {
  if (total <= 1) return RAMP[RAMP.length - 2]
  const position = (index / (total - 1)) * (RAMP.length - 1)
  return RAMP[Math.round(position)]
}

/** El tono de identidad del elemento `index`, o el gris si se pasó del tope. */
export function seriesColor(index: number): string {
  return SERIES[index] ?? SERIES_OTHER
}

/** Luminancia relativa de un `#rrggbb`, según la fórmula de la WCAG. */
function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

/**
 * La tinta de un texto que va *dentro* de un relleno de color.
 *
 * Es la única vez que un texto no usa los tonos de texto del sistema: sobre
 * el bronce apagado del primer escalón de la rampa, la tinta oscura de la
 * vitrina no se lee, y sobre el oro claro del último la tinta clara tampoco.
 * Se decide por la luminancia del relleno y no a ojo.
 */
export function inkOn(fill: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(fill)) return 'var(--bg-sunken)'
  return luminance(fill) > 0.32 ? 'var(--bg-sunken)' : 'var(--text)'
}

export interface TreemapItem {
  label: string
  count: number
}

export interface TreemapCell extends TreemapItem {
  x: number
  y: number
  w: number
  h: number
}

/** Cuánto se desvía de un cuadrado la peor baldosa de una fila. 1 es perfecto. */
function worstRatio(areas: number[], rowArea: number, side: number): number {
  const max = Math.max(...areas)
  const min = Math.min(...areas)
  const side2 = side * side
  const row2 = rowArea * rowArea
  return Math.max((side2 * max) / row2, row2 / (side2 * min))
}

/**
 * Reparte un rectángulo en baldosas de área proporcional al valor de cada
 * elemento (algoritmo *squarified* de Bruls, Huizing y van Wijk, 2000).
 *
 * El algoritmo ingenuo —ir cortando tiras— produce baldosas larguísimas y
 * finas, y un rectángulo de 200×4 no se compara con uno de 30×26 aunque
 * midan lo mismo. Éste va armando filas y cierra cada una cuando agregar
 * otro elemento empeoraría la baldosa más desproporcionada, de modo que
 * todas quedan lo más cuadradas posible y el área vuelve a ser legible.
 *
 * Espera los elementos ordenados de mayor a menor.
 */
export function squarify(
  items: TreemapItem[],
  width: number,
  height: number,
): TreemapCell[] {
  const positive = items.filter((item) => item.count > 0)
  if (positive.length === 0) return []

  const cells: TreemapCell[] = []
  let pending = [...positive]
  let remaining = pending.reduce((sum, item) => sum + item.count, 0)
  let [x, y, w, h] = [0, 0, width, height]

  while (pending.length > 0 && w > 0 && h > 0) {
    const side = Math.min(w, h)
    const scale = (w * h) / remaining

    let row: TreemapItem[] = []
    let rowValue = 0
    let best = Infinity

    while (pending.length > 0) {
      const candidate = [...row, pending[0]]
      const value = rowValue + pending[0].count
      const ratio = worstRatio(
        candidate.map((item) => item.count * scale),
        value * scale,
        side,
      )
      if (row.length > 0 && ratio > best) break
      row = candidate
      rowValue = value
      best = ratio
      pending = pending.slice(1)
    }

    const thickness = (rowValue * scale) / side
    let offset = 0
    const horizontal = w <= h

    for (const item of row) {
      const length = (item.count * scale) / thickness
      cells.push(
        horizontal
          ? { ...item, x: x + offset, y, w: length, h: thickness }
          : { ...item, x, y: y + offset, w: thickness, h: length },
      )
      offset += length
    }

    if (horizontal) {
      y += thickness
      h -= thickness
    } else {
      x += thickness
      w -= thickness
    }
    remaining -= rowValue
  }

  return cells
}

import { useEffect, useRef, useState } from 'react'

/** El ancho con el que se dibuja mientras todavía no se midió nada. */
const FALLBACK = 640

/**
 * El ancho real, en píxeles, del hueco donde va el gráfico.
 *
 * Un SVG con `viewBox` fijo se escala entero, texto incluido: el mismo
 * gráfico que se ve bien en el escritorio llega al teléfono con etiquetas de
 * seis píxeles. Dibujando sobre el ancho medido, en cambio, el texto
 * conserva su cuerpo y lo que cambia es cuánto espacio tiene el dato, que es
 * lo que corresponde que cambie.
 *
 * Si no hay `ResizeObserver` —jsdom en las pruebas— se queda con la medida
 * inicial, o con el ancho de respaldo: el gráfico se dibuja igual.
 */
export function useChartWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const box = ref.current
    if (!box) return

    setWidth(box.clientWidth)
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  return { ref, width: width || FALLBACK }
}

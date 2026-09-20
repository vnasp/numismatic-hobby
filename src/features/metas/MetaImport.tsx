import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { fillMetaDetails, importMetaList } from '../../lib/numista/proxyClient'
import type { Meta } from './useMeta'

/** Cada tipo son dos llamadas a Numista; 10 por vuelta va holgado. */
const BATCH = 10

interface Estado {
  corriendo: boolean
  mensaje: string | null
  error: string | null
}

/**
 * El panel de importación, que sólo aparece mientras falte traer algo.
 *
 * La importación es manual y no automática porque gasta cuota mensual de
 * la API, que es finita y se paga: dispararla sola cada vez que alguien
 * entra a la pantalla sería la forma más rápida de quemarla.
 *
 * Va en dos fases porque la API obliga: el listado dice qué tipos existen
 * pero no su número de catálogo, así que el número exige una llamada por
 * tipo. El detalle se pide de a lotes, y cada lote que llega queda
 * guardado: si la cuota se acaba a la mitad, lo bajado no se pierde y la
 * próxima corrida sigue donde iba.
 */
export function MetaImport({ meta }: { meta: Meta }) {
  const queryClient = useQueryClient()
  const [estado, setEstado] = useState<Estado>({
    corriendo: false,
    mensaje: null,
    error: null,
  })

  const faltaListar = !meta.listed
  const faltaDetalle = meta.pendingDetail > 0

  if (!faltaListar && !faltaDetalle && !estado.mensaje) return null

  async function refrescar() {
    await queryClient.invalidateQueries({ queryKey: ['meta', meta.slug] })
  }

  async function traerListado() {
    setEstado({ corriendo: true, mensaje: 'Pidiendo el listado a Numista…', error: null })
    try {
      const result = await importMetaList(meta.slug)
      await refrescar()
      setEstado({
        corriendo: false,
        mensaje: `Listado completo: ${result.imported} tipos en ${result.pages} ${
          result.pages === 1 ? 'llamada' : 'llamadas'
        }.`,
        error: null,
      })
    } catch (err) {
      setEstado({ corriendo: false, mensaje: null, error: (err as Error).message })
    }
  }

  async function traerDetalle() {
    setEstado({ corriendo: true, mensaje: 'Bajando los números de catálogo…', error: null })
    let bajados = 0

    try {
      // Se repite mientras queden pendientes. Se corta si una vuelta no
      // trae nada: significa que lo que falta no se puede bajar, y seguir
      // sería un bucle infinito contra la cuota.
      for (;;) {
        const result = await fillMetaDetails(meta.slug, BATCH)
        bajados += result.fetched

        if (result.quotaReached) {
          await refrescar()
          setEstado({
            corriendo: false,
            mensaje: null,
            error: `Se acabó la cuota de Numista. Alcanzaron a bajarse ${bajados}; vuelve el mes que viene y sigue donde quedó.`,
          })
          return
        }

        setEstado({
          corriendo: true,
          mensaje: `Bajando los números de catálogo… ${bajados} listos, faltan ${result.remaining}.`,
          error: null,
        })

        if (result.remaining <= 0 || result.fetched === 0) {
          await refrescar()
          setEstado({
            corriendo: false,
            mensaje:
              result.fetched === 0 && result.remaining > 0
                ? `Se bajaron ${bajados}. Quedaron ${result.remaining} que Numista no entrega.`
                : `Listo: ${bajados} números de catálogo.`,
            error: null,
          })
          return
        }
      }
    } catch (err) {
      await refrescar()
      setEstado({ corriendo: false, mensaje: null, error: (err as Error).message })
    }
  }

  return (
    <section className="card meta-import">
      <h2>Traer el catálogo</h2>

      {faltaListar ? (
        <p className="meta-import__text">
          Todavía no se ha consultado a Numista qué monedas componen esta meta. Son
          dos llamadas.
        </p>
      ) : (
        faltaDetalle && (
          <p className="meta-import__text">
            Falta el número de catálogo de {meta.pendingDetail}{' '}
            {meta.pendingDetail === 1 ? 'tipo' : 'tipos'}. El listado de Numista no lo
            trae, así que hay que pedir cada uno por separado.
          </p>
        )
      )}

      <div className="meta-import__actions">
        {faltaListar ? (
          <button
            type="button"
            className="btn btn--primary"
            disabled={estado.corriendo}
            onClick={traerListado}
          >
            {estado.corriendo ? 'Trayendo…' : 'Traer el listado'}
          </button>
        ) : (
          faltaDetalle && (
            <button
              type="button"
              className="btn btn--primary"
              disabled={estado.corriendo}
              onClick={traerDetalle}
            >
              {estado.corriendo ? 'Bajando…' : `Bajar ${meta.pendingDetail} números`}
            </button>
          )
        )}
      </div>

      {estado.mensaje && (
        <p className="meta-import__status" role="status">
          {estado.mensaje}
        </p>
      )}
      {estado.error && (
        <p className="alert alert--error" role="alert">
          {estado.error}
        </p>
      )}
    </section>
  )
}

/**
 * Importe con su símbolo, en formato español.
 *
 * Los pesos chilenos no usan decimales; el dólar y el euro sí. Intl ya lo
 * sabe por moneda, así que basta con dejarlo decidir.
 */
export function formatMoney(amount: number, currency: string): string {
  return amount.toLocaleString('es', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
  })
}

const formatterCache = new Map<string, Intl.NumberFormat>()

function getFormatter(currency: string) {
  const key = currency.toUpperCase()
  if (!formatterCache.has(key)) {
    formatterCache.set(
      key,
      new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: key,
        currencyDisplay: 'narrowSymbol',
        maximumFractionDigits: key === 'COP' ? 0 : 2,
      })
    )
  }
  return formatterCache.get(key)!
}

export function formatCurrency(amount: number, currency = 'COP'): string {
  try {
    return getFormatter(currency).format(amount)
  } catch {
    return `${amount.toLocaleString('es-CO')} ${currency}`
  }
}

export function formatSignedCurrency(amount: number, currency = 'COP'): string {
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : ''
  return `${sign}${formatCurrency(Math.abs(amount), currency)}`
}

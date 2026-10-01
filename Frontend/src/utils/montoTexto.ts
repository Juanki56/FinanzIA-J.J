/**
 * Montos en formato colombiano para los campos de dinero: "." para miles (se
 * ponen solos) y "," para decimales. Al escribir, el "." que teclee el usuario
 * se ignora, porque en es-CO es separador de miles. Lo pegado sí se interpreta
 * (ver `normalizarPegado`), para que "1500.50" no termine en 150.050.
 */

const MAX_DECIMALES = 2

/** Texto crudo → texto formateado ("1500000,5" → "1.500.000,5"). */
export function formatearMontoTexto(texto: string, permitirNegativo: boolean): string {
  const negativo = permitirNegativo && texto.trimStart().startsWith('-')
  const limpio = texto.replace(/[^\d,]/g, '')
  const coma = limpio.indexOf(',')
  const enteroCrudo = coma === -1 ? limpio : limpio.slice(0, coma)
  const decimales = coma === -1 ? null : limpio.slice(coma + 1).replace(/,/g, '').slice(0, MAX_DECIMALES)
  // Sin ceros a la izquierda ("007" → "7"), pero "0,5" se conserva.
  const entero = enteroCrudo.replace(/^0+(?=\d)/, '')
  const conPuntos = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const parteEntera = conPuntos === '' && decimales !== null ? '0' : conPuntos
  return `${negativo ? '-' : ''}${parteEntera}${decimales !== null ? `,${decimales}` : ''}`
}

/** Texto formateado → número, o '' si está vacío (para que zod decida). */
export function parsearMontoTexto(texto: string): number | '' {
  const normalizado = texto.replace(/\./g, '').replace(',', '.')
  if (normalizado === '' || normalizado === '-' || normalizado === '-.') return ''
  const n = Number(normalizado)
  return Number.isNaN(n) ? '' : n
}

/** Número del formulario → texto para mostrar al abrir (ej. al editar). */
export function textoDesdeValor(valor: unknown, permitirNegativo: boolean): string {
  if (valor === '' || valor === null || valor === undefined) return ''
  const n = typeof valor === 'number' ? valor : Number(valor)
  if (Number.isNaN(n)) return ''
  const fijo = (Math.round(n * 100) / 100).toString().replace('.', ',')
  return formatearMontoTexto(fijo, permitirNegativo)
}

/**
 * Texto PEGADO (de un correo, el banco, una hoja de cálculo…) → formato es-CO
 * crudo. Decide qué separador es el decimal:
 * - con "." y "," a la vez, el que va último es el decimal ("1,500.50" / "1.500,50");
 * - con un solo tipo, es de miles si se repite o le siguen exactamente 3
 *   dígitos ("1.500.000", "25,000"); si no, es decimal ("1500.5", "12,75").
 */
export function normalizarPegado(texto: string): string {
  const negativo = texto.trimStart().startsWith('-')
  const t = texto.replace(/[^\d.,]/g, '')
  const ultimoPunto = t.lastIndexOf('.')
  const ultimaComa = t.lastIndexOf(',')
  let entero: string
  let decimales: string | null = null

  if (ultimoPunto !== -1 && ultimaComa !== -1) {
    const sep = ultimoPunto > ultimaComa ? ultimoPunto : ultimaComa
    entero = t.slice(0, sep).replace(/[.,]/g, '')
    decimales = t.slice(sep + 1).replace(/[.,]/g, '')
  } else if (ultimoPunto !== -1 || ultimaComa !== -1) {
    const sepChar = ultimoPunto !== -1 ? '.' : ','
    const sep = Math.max(ultimoPunto, ultimaComa)
    const repetido = t.indexOf(sepChar) !== sep
    const despues = t.slice(sep + 1)
    if (repetido || despues.length === 3) {
      entero = t.replace(/[.,]/g, '')
    } else {
      entero = t.slice(0, sep)
      decimales = despues
    }
  } else {
    entero = t
  }
  return `${negativo ? '-' : ''}${entero}${decimales !== null ? `,${decimales}` : ''}`
}

/** Dígitos y comas antes de una posición: sirve para recolocar el cursor. */
export function cuentaDigitos(s: string): number {
  return (s.match(/[\d,]/g) ?? []).length
}

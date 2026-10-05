// Lógica de la calculadora (sin eval). La expresión se guarda como una lista
// de tokens: números como texto tal cual se teclean ("1500", "12.5", "10%")
// y operadores. × y ÷ van antes que + y −, como en cualquier calculadora.

export type Operador = '+' | '−' | '×' | '÷'
export type Token = string | Operador

const OPERADORES: Operador[] = ['+', '−', '×', '÷']

export function esOperador(token: Token | undefined): token is Operador {
  return token !== undefined && (OPERADORES as string[]).includes(token)
}

function valorNumero(token: string): number {
  return Number(token.replace('%', ''))
}

/**
 * Evalúa los tokens. Un porcentaje funciona como en el celular: después de
 * + o − es porcentaje de lo que va acumulado ("200000 + 10%" = 220000);
 * después de × o ÷, o solo, es la fracción ("50000 × 10%" = 5000).
 * Devuelve null si la expresión no se puede calcular (ej. dividir por 0).
 */
export function evaluar(tokens: Token[]): number | null {
  const limpios = esOperador(tokens[tokens.length - 1]) ? tokens.slice(0, -1) : tokens
  if (limpios.length === 0) return 0

  // Primero × y ÷: se agrupan en términos que después se suman o restan.
  const terminos: { signo: 1 | -1; valor: number; porcentaje: boolean }[] = []
  let signo: 1 | -1 = 1
  let actual: number | null = null
  let porcentajeSuelto = false

  for (let i = 0; i < limpios.length; i++) {
    const token = limpios[i] as Token
    if (esOperador(token)) {
      if (token === '+' || token === '−') {
        if (actual !== null) terminos.push({ signo, valor: actual, porcentaje: porcentajeSuelto })
        signo = token === '+' ? 1 : -1
        actual = null
        porcentajeSuelto = false
      }
      continue
    }

    const esPorcentaje = token.endsWith('%')
    const numero = esPorcentaje ? valorNumero(token) / 100 : valorNumero(token)
    const anterior = limpios[i - 1]
    if (actual === null) {
      actual = numero
      porcentajeSuelto = esPorcentaje
    } else if (anterior === '×') {
      actual *= numero
      porcentajeSuelto = false
    } else if (anterior === '÷') {
      if (numero === 0) return null
      actual /= numero
      porcentajeSuelto = false
    }
  }
  if (actual !== null) terminos.push({ signo, valor: actual, porcentaje: porcentajeSuelto })

  let total = 0
  terminos.forEach((t, i) => {
    // "a + b%": el porcentaje es sobre lo acumulado, no un número suelto.
    const valor = t.porcentaje && i > 0 ? total * t.valor : t.valor
    total += t.signo * valor
  })

  // Corta el ruido de coma flotante (0.1 + 0.2) sin perder centavos.
  return Math.round(total * 1e8) / 1e8
}

/** "1234567.5" -> "1.234.567,5" (es-CO), conservando lo que se está tecleando. */
export function formatearToken(token: Token): string {
  if (esOperador(token)) return token
  const porcentaje = token.endsWith('%') ? '%' : ''
  const sinPorcentaje = token.replace('%', '')
  const [entero = '', decimal] = sinPorcentaje.split('.')
  const negativo = entero.startsWith('-') ? '-' : ''
  const digitos = entero.replace('-', '')
  const conMiles = digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${negativo}${conMiles}${decimal !== undefined ? `,${decimal}` : ''}${porcentaje}`
}

/** Resultado para mostrar: hasta 2 decimales, separadores es-CO. */
export function formatearResultado(valor: number): string {
  return valor.toLocaleString('es-CO', { maximumFractionDigits: 2 })
}

/** Convierte un resultado numérico en token editable ("1234.5"). */
export function numeroAToken(valor: number): string {
  return String(Math.round(valor * 100) / 100)
}

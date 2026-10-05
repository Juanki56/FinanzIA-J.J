import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { Copy, Delete } from 'lucide-react'
import {
  esOperador,
  evaluar,
  formatearResultado,
  formatearToken,
  numeroAToken,
  type Operador,
  type Token,
} from '@/utils/calculadora'
import { notifySuccess } from '@/utils/toast'

interface BasicCalculatorProps {
  tokens: Token[]
  onChange: (tokens: Token[]) => void
}

const MAX_DIGITOS = 15

type Tecla =
  | { tipo: 'digito'; valor: string }
  | { tipo: 'operador'; valor: Operador }
  | { tipo: 'coma' | 'porcentaje' | 'borrar' | 'limpiar' | 'igual' }

const TECLADO: { etiqueta: string; tecla: Tecla; clase?: string }[] = [
  { etiqueta: 'C', tecla: { tipo: 'limpiar' }, clase: 'text-coral-400' },
  { etiqueta: '⌫', tecla: { tipo: 'borrar' } },
  { etiqueta: '%', tecla: { tipo: 'porcentaje' } },
  { etiqueta: '÷', tecla: { tipo: 'operador', valor: '÷' }, clase: 'text-cyan-300' },
  { etiqueta: '7', tecla: { tipo: 'digito', valor: '7' } },
  { etiqueta: '8', tecla: { tipo: 'digito', valor: '8' } },
  { etiqueta: '9', tecla: { tipo: 'digito', valor: '9' } },
  { etiqueta: '×', tecla: { tipo: 'operador', valor: '×' }, clase: 'text-cyan-300' },
  { etiqueta: '4', tecla: { tipo: 'digito', valor: '4' } },
  { etiqueta: '5', tecla: { tipo: 'digito', valor: '5' } },
  { etiqueta: '6', tecla: { tipo: 'digito', valor: '6' } },
  { etiqueta: '−', tecla: { tipo: 'operador', valor: '−' }, clase: 'text-cyan-300' },
  { etiqueta: '1', tecla: { tipo: 'digito', valor: '1' } },
  { etiqueta: '2', tecla: { tipo: 'digito', valor: '2' } },
  { etiqueta: '3', tecla: { tipo: 'digito', valor: '3' } },
  { etiqueta: '+', tecla: { tipo: 'operador', valor: '+' }, clase: 'text-cyan-300' },
  { etiqueta: '0', tecla: { tipo: 'digito', valor: '0' }, clase: 'col-span-2' },
  { etiqueta: ',', tecla: { tipo: 'coma' } },
  { etiqueta: '=', tecla: { tipo: 'igual' }, clase: 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white' },
]

// Teclado físico -> tecla de la calculadora.
function teclaDesdeEvento(e: KeyboardEvent): Tecla | null {
  if (/^[0-9]$/.test(e.key)) return { tipo: 'digito', valor: e.key }
  switch (e.key) {
    case '+': return { tipo: 'operador', valor: '+' }
    case '-': return { tipo: 'operador', valor: '−' }
    case '*': case 'x': return { tipo: 'operador', valor: '×' }
    case '/': return { tipo: 'operador', valor: '÷' }
    case ',': case '.': return { tipo: 'coma' }
    case '%': return { tipo: 'porcentaje' }
    case 'Enter': case '=': return { tipo: 'igual' }
    case 'Backspace': return { tipo: 'borrar' }
    case 'Delete': case 'c': case 'C': return { tipo: 'limpiar' }
    default: return null
  }
}

export function BasicCalculator({ tokens, onChange }: BasicCalculatorProps) {
  // Tras "=", el siguiente dígito empieza una cuenta nueva (como en el celular).
  // Arranca así si llega un solo número (ej. el total de "Sumar cuentas"):
  // con un operador sigue la cuenta, con un dígito empieza otra.
  const [recienCalculado, setRecienCalculado] = useState(
    () => tokens.length === 1 && !esOperador(tokens[0])
  )
  const [error, setError] = useState<string | null>(null)

  const ultimo = tokens[tokens.length - 1]
  const resultado = evaluar(tokens)

  function presionar(tecla: Tecla) {
    setError(null)
    const esNumero = ultimo !== undefined && !esOperador(ultimo)

    switch (tecla.tipo) {
      case 'digito': {
        if (recienCalculado || tokens.length === 0) {
          onChange([tecla.valor])
        } else if (esNumero && !ultimo.endsWith('%')) {
          if (ultimo.replace(/\D/g, '').length >= MAX_DIGITOS) return
          onChange([...tokens.slice(0, -1), ultimo === '0' ? tecla.valor : ultimo + tecla.valor])
        } else if (!esNumero) {
          onChange([...tokens, tecla.valor])
        }
        break
      }
      case 'coma': {
        if (recienCalculado || tokens.length === 0) onChange(['0.'])
        else if (!esNumero) onChange([...tokens, '0.'])
        else if (!ultimo.includes('.') && !ultimo.endsWith('%')) onChange([...tokens.slice(0, -1), `${ultimo}.`])
        break
      }
      case 'operador': {
        if (tokens.length === 0) return
        if (esOperador(ultimo)) onChange([...tokens.slice(0, -1), tecla.valor])
        else onChange([...tokens, tecla.valor])
        break
      }
      case 'porcentaje': {
        if (esNumero && !ultimo.endsWith('%')) onChange([...tokens.slice(0, -1), `${ultimo}%`])
        break
      }
      case 'borrar': {
        if (recienCalculado) {
          onChange([])
        } else if (esNumero && ultimo.length > 1 && ultimo !== '-0') {
          const recortado = ultimo.slice(0, -1)
          onChange(recortado === '-' ? tokens.slice(0, -1) : [...tokens.slice(0, -1), recortado])
        } else {
          onChange(tokens.slice(0, -1))
        }
        break
      }
      case 'limpiar':
        onChange([])
        break
      case 'igual': {
        if (tokens.length === 0) return
        if (resultado === null) {
          setError('No se puede dividir por 0')
          return
        }
        onChange([numeroAToken(resultado)])
        setRecienCalculado(true)
        return
      }
    }
    setRecienCalculado(false)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      // No robar las teclas si el foco está en un campo de texto.
      const destino = e.target as HTMLElement | null
      if (destino && ['INPUT', 'TEXTAREA', 'SELECT'].includes(destino.tagName)) return
      const tecla = teclaDesdeEvento(e)
      if (!tecla) return
      e.preventDefault()
      presionar(tecla)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  async function copiar() {
    if (resultado === null) return
    try {
      await navigator.clipboard.writeText(formatearResultado(resultado))
      notifySuccess('Resultado copiado')
    } catch {
      // Sin permiso de portapapeles: no pasa nada, el número sigue en pantalla.
    }
  }

  const expresion = tokens.map(formatearToken).join(' ')

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-white/[0.04] px-4 py-3 text-right">
        <p className="min-h-5 break-all text-sm text-ink-400">{expresion || ' '}</p>
        <div className="mt-1 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={copiar}
            className="rounded-lg p-1.5 text-ink-500 hover:bg-white/8 hover:text-ink-200"
            aria-label="Copiar resultado"
          >
            <Copy className="size-4" />
          </button>
          <p className="font-tabular font-display text-3xl text-ink-100 break-all" aria-live="polite">
            {error ?? (resultado === null ? '—' : formatearResultado(resultado))}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {TECLADO.map(({ etiqueta, tecla, clase }) => (
          <button
            key={etiqueta}
            type="button"
            onClick={() => presionar(tecla)}
            className={clsx(
              'flex h-12 items-center justify-center rounded-xl bg-white/[0.06] text-lg font-semibold text-ink-100 transition hover:bg-white/10 active:scale-95',
              clase
            )}
            aria-label={etiqueta === '⌫' ? 'Borrar' : etiqueta}
          >
            {etiqueta === '⌫' ? <Delete className="size-5" /> : etiqueta}
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-ink-500">También puedes usar el teclado.</p>
    </div>
  )
}

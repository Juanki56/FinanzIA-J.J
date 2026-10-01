import { useLayoutEffect, useRef, useState, type InputHTMLAttributes } from 'react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Input } from './Field'
import {
  cuentaDigitos,
  formatearMontoTexto,
  normalizarPegado,
  parsearMontoTexto,
  textoDesdeValor,
} from '@/utils/montoTexto'

interface MoneyInputProps<T extends FieldValues>
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'value' | 'defaultValue' | 'onChange' | 'type'> {
  control: Control<T>
  name: FieldPath<T>
  label?: string
  error?: string
  hint?: string
  /** Para saldos, que sí pueden quedar en negativo. Los montos no. */
  permitirNegativo?: boolean
}

/**
 * Campo de dinero: muestra "1.500.000" mientras se escribe, pero al
 * formulario le entrega el número limpio (1500000), así que los esquemas zod
 * y lo que se envía al backend no cambian.
 */
export function MoneyInput<T extends FieldValues>({
  control,
  name,
  permitirNegativo = false,
  placeholder = '0',
  ...props
}: MoneyInputProps<T>) {
  const { field } = useController({ control, name })
  const inputRef = useRef<HTMLInputElement | null>(null)
  const caretPendiente = useRef<number | null>(null)
  const [texto, setTexto] = useState(() => textoDesdeValor(field.value, permitirNegativo))

  // Si el valor cambia desde fuera (reset del formulario), se re-sincroniza el
  // texto; si coincide con lo que ya se ve, se respeta lo escrito (ej. "1.000,").
  const valorMostrado = parsearMontoTexto(texto)
  const valorExterno = field.value === undefined || field.value === null ? '' : field.value
  if (valorExterno !== valorMostrado && Number(valorExterno) !== Number(valorMostrado)) {
    setTexto(textoDesdeValor(valorExterno, permitirNegativo))
  }

  // Al insertar puntos el texto se alarga: se recoloca el cursor después del
  // mismo número de dígitos que tenía antes, para poder editar en medio.
  useLayoutEffect(() => {
    if (caretPendiente.current === null || !inputRef.current) return
    const objetivo = caretPendiente.current
    caretPendiente.current = null
    const valor = inputRef.current.value
    let pos = 0
    let vistos = 0
    while (pos < valor.length && vistos < objetivo) {
      if (/[\d,]/.test(valor[pos])) vistos++
      pos++
    }
    inputRef.current.setSelectionRange(pos, pos)
  }, [texto])

  function aplicar(crudo: string, digitosAntesDelCursor: number) {
    caretPendiente.current = digitosAntesDelCursor
    const nuevo = formatearMontoTexto(crudo, permitirNegativo)
    setTexto(nuevo)
    field.onChange(parsearMontoTexto(nuevo))
  }

  return (
    <Input
      {...props}
      ref={(el) => {
        inputRef.current = el
        field.ref(el)
      }}
      name={field.name}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      value={texto}
      onBlur={field.onBlur}
      onPaste={(e) => {
        // Lo pegado puede venir en otro formato ("1,500.50", "$ 25.000"): se
        // interpreta SOLO eso y se inserta donde está el cursor.
        e.preventDefault()
        const el = e.currentTarget
        const inicio = el.selectionStart ?? texto.length
        const fin = el.selectionEnd ?? texto.length
        const antes = texto.slice(0, inicio) + normalizarPegado(e.clipboardData.getData('text'))
        aplicar(antes + texto.slice(fin), cuentaDigitos(antes))
      }}
      onChange={(e) => {
        let crudo = e.target.value
        let caret = e.target.selectionStart ?? crudo.length
        // Si solo se borró un punto de miles, el formato lo volvería a poner y
        // la tecla parecería no hacer nada: se borra el dígito vecino.
        const tipo = (e.nativeEvent as InputEvent).inputType
        const borroSoloUnPunto = crudo.length === texto.length - 1 && texto[caret] === '.'
        if (borroSoloUnPunto) {
          if (tipo === 'deleteContentBackward' && caret > 0) {
            crudo = crudo.slice(0, caret - 1) + crudo.slice(caret)
            caret -= 1
          } else if (tipo === 'deleteContentForward') {
            crudo = crudo.slice(0, caret) + crudo.slice(caret + 1)
          }
        }
        aplicar(crudo, cuentaDigitos(crudo.slice(0, caret)))
      }}
    />
  )
}

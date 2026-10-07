import { useState } from 'react'
import type { Cuenta } from '@/types'

/** Las cuentas de deuda restan: lo que debes no es plata disponible. */
export function sumarSaldos(cuentas: Cuenta[]): number {
  return cuentas.reduce((suma, c) => suma + (c.es_pasivo ? -c.saldo_actual : c.saldo_actual), 0)
}

// La selección de cuentas se recuerda en este navegador y la comparten las
// pestañas de la calculadora: casi siempre se usan las mismas cuentas (ej.
// ahorros + Bancolombia). Si el almacenamiento falla, arranca vacía.
const CLAVE_SELECCION = 'finanzia_calculadora_cuentas'

function leerSeleccion(): string[] {
  try {
    const guardado = localStorage.getItem(CLAVE_SELECCION)
    return guardado ? (JSON.parse(guardado) as string[]) : []
  } catch {
    return []
  }
}

export function useSeleccionCuentas() {
  const [seleccion, setSeleccion] = useState<string[]>(leerSeleccion)

  function cambiar(ids: string[]) {
    setSeleccion(ids)
    try {
      localStorage.setItem(CLAVE_SELECCION, JSON.stringify(ids))
    } catch {
      // Sin almacenamiento solo se pierde el recordatorio, no el cálculo.
    }
  }

  function alternar(id: string) {
    cambiar(seleccion.includes(id) ? seleccion.filter((s) => s !== id) : [...seleccion, id])
  }

  return { seleccion, cambiar, alternar }
}

import { useMemo } from 'react'
import { useTodosLosMovimientos } from './useMovimientos'

/** Racha de días consecutivos (incluyendo hoy o ayer) con al menos un movimiento registrado. */
export function useStreak() {
  const { data: movimientos } = useTodosLosMovimientos()

  return useMemo(() => {
    if (!movimientos || movimientos.length === 0) return 0

    const dias = new Set(movimientos.map((m) => m.fecha_movimiento.slice(0, 10)))
    const cursor = new Date()
    cursor.setHours(0, 0, 0, 0)

    // Si hoy no tiene movimiento todavía, la racha puede seguir contando desde ayer.
    const hoyISO = cursor.toISOString().slice(0, 10)
    if (!dias.has(hoyISO)) {
      cursor.setDate(cursor.getDate() - 1)
    }

    let racha = 0
    while (true) {
      const iso = cursor.toISOString().slice(0, 10)
      if (!dias.has(iso)) break
      racha += 1
      cursor.setDate(cursor.getDate() - 1)
    }
    return racha
  }, [movimientos])
}

import { useMemo } from 'react'
import { useTodosLosMovimientos } from './useMovimientos'
import { dateOnlyLocal } from '@/utils/date'

/** Racha de días consecutivos (incluyendo hoy o ayer) con al menos un movimiento registrado. */
export function useStreak() {
  const { data: movimientos } = useTodosLosMovimientos()

  return useMemo(() => {
    if (!movimientos || movimientos.length === 0) return 0

    // dateOnlyLocal, no .slice(0, 10) -- fecha_movimiento trae hora real, y
    // cortar el string UTC crudo adelanta un día los movimientos de la noche
    // (hora Colombia) al cruzar la medianoche UTC.
    const dias = new Set(movimientos.map((m) => dateOnlyLocal(m.fecha_movimiento)))
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

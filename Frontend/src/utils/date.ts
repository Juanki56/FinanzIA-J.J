import { format, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

/** Fecha de HOY en la zona horaria LOCAL del navegador, como "YYYY-MM-DD". */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/**
 * Convierte un timestamp completo (con hora y offset, ej. `fecha_movimiento`)
 * a solo la fecha, en la zona horaria LOCAL del navegador.
 *
 * Nunca uses `.slice(0, 10)` sobre un timestamp así — eso toma la fecha en
 * UTC tal cual viene el string, y en Colombia (UTC-5) un movimiento de la
 * noche (ej. 8pm) queda guardado como la 1am UTC del día SIGUIENTE, así que
 * cortar el string cruzudo adelanta la fecha un día. `dateOnlyLocal` sí
 * convierte primero a hora local antes de quedarse con la fecha.
 *
 * Esto NO aplica a campos que ya son solo-fecha sin hora (fecha_inicio de
 * presupuestos/recurrentes, fecha_objetivo) — esos no tienen este problema
 * porque no cargan una hora que pueda cruzar la medianoche.
 */
export function dateOnlyLocal(value: string): string {
  const date = parseISO(value)
  if (!isValid(date)) return value.slice(0, 10)
  return format(date, 'yyyy-MM-dd')
}

export function formatDate(value: string | null | undefined, pattern = 'd MMM yyyy'): string {
  if (!value) return '—'
  const date = value.length === 10 ? parseISO(`${value}T00:00:00`) : parseISO(value)
  if (!isValid(date)) return value
  return format(date, pattern, { locale: es })
}

export function formatDateTime(value: string | null | undefined): string {
  return formatDate(value, "d MMM yyyy, h:mm a")
}

export const DIAS_SEMANA = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
]

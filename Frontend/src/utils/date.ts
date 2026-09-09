import { format, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
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

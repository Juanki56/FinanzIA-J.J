import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isSameMonth,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
} from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Un periodo del dashboard: días LOCALES "YYYY-MM-DD", ambos inclusivos.
 * Son fechas de calendario sin hora; para consultar `fecha_movimiento` (que sí
 * tiene hora) se convierten con `periodoAConsulta`.
 */
export interface Periodo {
  desde: string
  hasta: string
}

export type PresetPeriodo = 'este_mes' | 'mes_anterior' | 'ultimos_3_meses' | 'este_anio'

export const PRESETS: { id: PresetPeriodo; label: string }[] = [
  { id: 'este_mes', label: 'Este mes' },
  { id: 'mes_anterior', label: 'Mes anterior' },
  { id: 'ultimos_3_meses', label: 'Últimos 3 meses' },
  { id: 'este_anio', label: 'Este año' },
]

const fmt = (d: Date) => format(d, 'yyyy-MM-dd')

/** "YYYY-MM-DD" → Date a medianoche LOCAL (nunca `new Date(str)`, que asume UTC). */
export function diaLocal(value: string): Date {
  return parseISO(`${value}T00:00:00`)
}

export function periodoDePreset(preset: PresetPeriodo, hoy = new Date()): Periodo {
  switch (preset) {
    case 'este_mes':
      return { desde: fmt(startOfMonth(hoy)), hasta: fmt(endOfMonth(hoy)) }
    case 'mes_anterior': {
      const mes = subMonths(hoy, 1)
      return { desde: fmt(startOfMonth(mes)), hasta: fmt(endOfMonth(mes)) }
    }
    case 'ultimos_3_meses':
      return { desde: fmt(startOfMonth(subMonths(hoy, 2))), hasta: fmt(endOfMonth(hoy)) }
    case 'este_anio':
      return { desde: fmt(startOfYear(hoy)), hasta: fmt(endOfMonth(hoy)) }
  }
}

export function presetActivo(periodo: Periodo, hoy = new Date()): PresetPeriodo | null {
  return PRESETS.find(({ id }) => {
    const p = periodoDePreset(id, hoy)
    return p.desde === periodo.desde && p.hasta === periodo.hasta
  })?.id ?? null
}

export function esPeriodoValido(periodo: Partial<Periodo>): periodo is Periodo {
  if (!periodo.desde || !periodo.hasta) return false
  const d = diaLocal(periodo.desde)
  const h = diaLocal(periodo.hasta)
  return isValid(d) && isValid(h) && d <= h
}

/** Un mes calendario completo (1 al último día del mismo mes). */
export function esMesCompleto({ desde, hasta }: Periodo): boolean {
  const d = diaLocal(desde)
  const h = diaLocal(hasta)
  return d.getDate() === 1 && isSameMonth(d, h) && fmt(endOfMonth(d)) === hasta
}

/** Cantidad de meses si el rango va del día 1 a fin de mes (1 = un mes); si no, null. */
function mesesCompletos({ desde, hasta }: Periodo): number | null {
  const d = diaLocal(desde)
  const h = diaLocal(hasta)
  if (d.getDate() !== 1 || fmt(endOfMonth(h)) !== hasta) return null
  return (h.getFullYear() - d.getFullYear()) * 12 + (h.getMonth() - d.getMonth()) + 1
}

/**
 * Si el periodo está en curso (incluye hoy), recorta `anterior` a la misma
 * cantidad de días transcurridos: el 10 de octubre se compara contra el 1–10
 * de septiembre, no contra septiembre completo. Devuelve los días comparados,
 * o null si no hubo recorte.
 */
export function recortarAlCorte(periodo: Periodo, anterior: Periodo, hoy: string): { anterior: Periodo; dias: number | null } {
  if (!(periodo.desde <= hoy && hoy < periodo.hasta)) return { anterior, dias: null }
  const dias = differenceInCalendarDays(diaLocal(hoy), diaLocal(periodo.desde)) + 1
  const hasta = fmt(addDays(diaLocal(anterior.desde), dias - 1))
  return { anterior: { desde: anterior.desde, hasta: hasta < anterior.hasta ? hasta : anterior.hasta }, dias }
}

export function duracionDias({ desde, hasta }: Periodo): number {
  return differenceInCalendarDays(diaLocal(hasta), diaLocal(desde)) + 1
}

/**
 * Mueve el periodo `pasos` posiciones (negativo = hacia atrás). Un mes completo
 * se mueve por meses calendario (sep → ago, aunque tengan distinta cantidad de
 * días); cualquier otro rango se desplaza por su propia duración.
 */
export function desplazarPeriodo(periodo: Periodo, pasos: number): Periodo {
  const meses = mesesCompletos(periodo)
  if (meses !== null) {
    // Un rango que arranca el 1 de enero (ej. "Este año" = ene–oct) se mueve
    // por años, para comparar contra los mismos meses del año pasado.
    const salto = diaLocal(periodo.desde).getMonth() === 0 && meses < 12 ? 12 : meses
    const inicio = addMonths(diaLocal(periodo.desde), pasos * salto)
    return { desde: fmt(inicio), hasta: fmt(endOfMonth(addMonths(inicio, meses - 1))) }
  }
  const dias = duracionDias(periodo) * pasos
  return { desde: fmt(addDays(diaLocal(periodo.desde), dias)), hasta: fmt(addDays(diaLocal(periodo.hasta), dias)) }
}

export function periodoAnterior(periodo: Periodo): Periodo {
  return desplazarPeriodo(periodo, -1)
}

/** Timestamps ISO para el backend: `desde` inclusivo, `hasta` exclusivo (día siguiente). */
export function periodoAConsulta({ desde, hasta }: Periodo): { desde: string; hasta: string } {
  return {
    desde: diaLocal(desde).toISOString(),
    hasta: addDays(diaLocal(hasta), 1).toISOString(),
  }
}

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function etiquetaPeriodo(periodo: Periodo): string {
  const d = diaLocal(periodo.desde)
  const h = diaLocal(periodo.hasta)
  if (esMesCompleto(periodo)) return capitalizar(format(d, 'MMMM yyyy', { locale: es }))
  if (d.getDate() === 1 && fmt(endOfMonth(h)) === periodo.hasta) {
    const mismoAnio = d.getFullYear() === h.getFullYear()
    return `${capitalizar(format(d, mismoAnio ? 'MMM' : 'MMM yyyy', { locale: es }))} – ${format(h, 'MMM yyyy', { locale: es })}`
  }
  const mismoAnio = d.getFullYear() === h.getFullYear()
  return `${format(d, mismoAnio ? 'd MMM' : 'd MMM yyyy', { locale: es })} – ${format(h, 'd MMM yyyy', { locale: es })}`
}

/** Etiqueta corta para "vs …" en las tarjetas de comparación. */
export function etiquetaComparacion(anterior: Periodo, diasCorte: number | null = null): string {
  const d = diaLocal(anterior.desde)
  const meses = mesesCompletos(anterior)
  if (diasCorte !== null) {
    return `${format(d, "d MMM", { locale: es })} – ${format(diaLocal(anterior.hasta), 'd MMM yyyy', { locale: es })}`
  }
  if (meses === 1) return format(d, 'MMMM yyyy', { locale: es })
  if (meses !== null) return etiquetaPeriodo(anterior).toLowerCase()
  return 'el periodo anterior'
}

export type Agrupacion = 'dia' | 'semana' | 'mes'

export function agrupacionPara(periodo: Periodo): Agrupacion {
  const dias = duracionDias(periodo)
  if (dias <= 31) return 'dia'
  if (dias <= 92) return 'semana'
  return 'mes'
}

export interface Tramo {
  /** Clave = fecha local "YYYY-MM-DD" de inicio del tramo. */
  clave: string
  etiqueta: string
  etiquetaLarga: string
}

/** Tramos consecutivos que cubren el periodo, para el eje X del gráfico. */
export function tramosDelPeriodo(periodo: Periodo, agrupacion: Agrupacion): Tramo[] {
  const tramos: Tramo[] = []
  const fin = diaLocal(periodo.hasta)
  let cursor = inicioDeTramo(diaLocal(periodo.desde), agrupacion)
  while (cursor <= fin) {
    tramos.push({
      clave: fmt(cursor),
      etiqueta:
        agrupacion === 'dia'
          ? format(cursor, 'd', { locale: es })
          : agrupacion === 'semana'
            ? format(cursor, 'd MMM', { locale: es })
            : capitalizar(format(cursor, 'MMM', { locale: es })),
      etiquetaLarga:
        agrupacion === 'dia'
          ? format(cursor, "EEEE d 'de' MMMM", { locale: es })
          : agrupacion === 'semana'
            ? `Semana del ${format(cursor, "d 'de' MMMM", { locale: es })}`
            : capitalizar(format(cursor, 'MMMM yyyy', { locale: es })),
    })
    cursor =
      agrupacion === 'dia'
        ? addDays(cursor, 1)
        : agrupacion === 'semana'
          ? addDays(cursor, 7)
          : addMonths(cursor, 1)
  }
  return tramos
}

/** Clave del tramo al que pertenece un día local "YYYY-MM-DD". */
export function claveDeTramo(dia: string, agrupacion: Agrupacion): string {
  return fmt(inicioDeTramo(diaLocal(dia), agrupacion))
}

function inicioDeTramo(fecha: Date, agrupacion: Agrupacion): Date {
  if (agrupacion === 'semana') return startOfWeek(fecha, { weekStartsOn: 1 })
  if (agrupacion === 'mes') return startOfMonth(fecha)
  return fecha
}


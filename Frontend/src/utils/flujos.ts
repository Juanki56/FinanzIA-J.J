import { dateOnlyLocal } from '@/utils/date'
import { agrupacionPara, claveDeTramo, tramosDelPeriodo, type Periodo } from '@/utils/periodo'
import type { Categoria, Movimiento } from '@/types'

/**
 * Cálculos de ingresos/gastos compartidos por el dashboard y las categorías.
 * Solo cuentan ingresos y gastos reales: fuera transferencias entre cuentas,
 * ajustes de saldo, cancelados y eliminados. Los pendientes sí cuentan.
 */

export type MovimientoFlujo = Movimiento & { tipo: 'income' | 'expense' }

export function esFlujo(m: Movimiento): m is MovimientoFlujo {
  return (m.tipo === 'income' || m.tipo === 'expense') && !m.eliminado && m.estado !== 'cancelled'
}

export interface TotalesPeriodo {
  ingresos: number
  gastos: number
}

export function totales(movs: Movimiento[]): TotalesPeriodo {
  let ingresos = 0
  let gastos = 0
  for (const m of movs) {
    if (m.tipo === 'income') ingresos += Number(m.monto)
    else if (m.tipo === 'expense') gastos += Number(m.monto)
  }
  return { ingresos, gastos }
}

export function enPeriodo<T extends Movimiento>(movs: T[], periodo: Periodo): T[] {
  return movs.filter((m) => {
    const dia = dateOnlyLocal(m.fecha_movimiento)
    return dia >= periodo.desde && dia <= periodo.hasta
  })
}

export interface PuntoSerie {
  clave: string
  etiqueta: string
  etiquetaLarga: string
  ingresos: number
  gastos: number
}

/** Serie por día / semana / mes (según la duración del periodo) para el gráfico. */
export function serieDelPeriodo(movs: Movimiento[], periodo: Periodo): PuntoSerie[] {
  const agrupacion = agrupacionPara(periodo)
  const serie: PuntoSerie[] = tramosDelPeriodo(periodo, agrupacion).map((t) => ({ ...t, ingresos: 0, gastos: 0 }))
  const porClave = new Map(serie.map((p) => [p.clave, p]))
  for (const m of movs) {
    const punto = porClave.get(claveDeTramo(dateOnlyLocal(m.fecha_movimiento), agrupacion))
    if (!punto) continue
    if (m.tipo === 'income') punto.ingresos += Number(m.monto)
    else if (m.tipo === 'expense') punto.gastos += Number(m.monto)
  }
  return serie
}

/** Id especial para los movimientos sin categoría (se puede abrir como una más). */
export const SIN_CATEGORIA = 'sin-categoria'

/** La categoría + sus subcategorías: abrir "Comida" incluye "Comida › Restaurantes". */
export function idsDeCategoria(categoriaId: string, categorias: Categoria[]): Set<string> {
  const ids = new Set([categoriaId])
  for (const c of categorias) if (c.categoria_padre_id === categoriaId) ids.add(c.id)
  return ids
}

export function perteneceA(m: Movimiento, ids: Set<string>): boolean {
  return ids.has(m.categoria_id ?? SIN_CATEGORIA)
}

export interface ResumenCategoria extends TotalesPeriodo {
  cantidad: number
}

/**
 * Totales por categoría en un solo recorrido. Cada categoría padre acumula
 * también lo de sus subcategorías, igual que en su página de detalle.
 */
export function resumenPorCategoria(movs: Movimiento[], categorias: Categoria[]): Map<string, ResumenCategoria> {
  const padreDe = new Map(categorias.map((c) => [c.id, c.categoria_padre_id]))
  const resumen = new Map<string, ResumenCategoria>()
  const sumar = (id: string, m: Movimiento) => {
    const r = resumen.get(id) ?? { ingresos: 0, gastos: 0, cantidad: 0 }
    if (m.tipo === 'income') r.ingresos += Number(m.monto)
    else if (m.tipo === 'expense') r.gastos += Number(m.monto)
    r.cantidad += 1
    resumen.set(id, r)
  }
  for (const m of movs) {
    const id = m.categoria_id ?? SIN_CATEGORIA
    sumar(id, m)
    const padre = padreDe.get(id)
    if (padre) sumar(padre, m)
  }
  return resumen
}

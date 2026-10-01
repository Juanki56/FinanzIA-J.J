import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/apiClient'
import type { Movimiento, MovimientosPage } from '@/types'

// El límite máximo que acepta el backend es 200. Lo usamos como "trae todo lo
// que puedas" para vistas que necesitan el conjunto completo (dashboard,
// cálculo de racha) en vez de una página paginada para navegar.
export const LIMITE_MAXIMO_MOVIMIENTOS = 200

/** Filtros que aplica el backend. `desde` inclusivo / `hasta` exclusivo, timestamps ISO. */
export interface FiltrosMovimientos {
  cuentaId?: string
  categoriaId?: string
  tipo?: string
  desde?: string
  hasta?: string
}

export function useMovimientos(opts?: {
  incluirEliminados?: boolean
  pagina?: number
  limite?: number
  filtros?: FiltrosMovimientos
}) {
  const incluirEliminados = opts?.incluirEliminados ?? false
  const pagina = opts?.pagina ?? 1
  const limite = opts?.limite ?? 20
  const filtros = opts?.filtros ?? {}

  return useQuery({
    queryKey: ['movimientos', { incluirEliminados, pagina, limite, filtros }],
    queryFn: () => {
      const params = new URLSearchParams({ pagina: String(pagina), limite: String(limite) })
      if (incluirEliminados) params.set('incluir_eliminados', 'true')
      if (filtros.cuentaId) params.set('cuenta_id', filtros.cuentaId)
      if (filtros.categoriaId) params.set('categoria_id', filtros.categoriaId)
      if (filtros.tipo) params.set('tipo', filtros.tipo)
      if (filtros.desde) params.set('desde', filtros.desde)
      if (filtros.hasta) params.set('hasta', filtros.hasta)
      return api.get<MovimientosPage>(`/movimientos?${params.toString()}`)
    },
    placeholderData: keepPreviousData,
  })
}

/** Trae movimientos en bloque (hasta el límite máximo del backend), solo el arreglo. */
export function useTodosLosMovimientos(opts?: { incluirEliminados?: boolean }) {
  const { data, ...rest } = useMovimientos({ ...opts, pagina: 1, limite: LIMITE_MAXIMO_MOVIMIENTOS })
  return { ...rest, data: data?.movimientos as Movimiento[] | undefined }
}

/**
 * Trae TODOS los movimientos con fecha_movimiento en [desde, hasta) (timestamps
 * ISO), recorriendo las páginas del backend. A diferencia de
 * useTodosLosMovimientos no se corta en los 200 más recientes, así que sirve
 * para mirar meses anteriores.
 */
export function useMovimientosRango(desde: string, hasta: string) {
  return useQuery({
    queryKey: ['movimientos', 'rango', { desde, hasta }],
    queryFn: async () => {
      const todos: Movimiento[] = []
      for (let pagina = 1; ; pagina++) {
        const params = new URLSearchParams({
          pagina: String(pagina),
          limite: String(LIMITE_MAXIMO_MOVIMIENTOS),
          desde,
          hasta,
        })
        const res = await api.get<MovimientosPage>(`/movimientos?${params.toString()}`)
        todos.push(...res.movimientos)
        if (pagina >= res.paginacion.total_paginas) break
      }
      return todos
    },
    placeholderData: keepPreviousData,
  })
}

export type NuevoMovimientoInput = {
  cuenta_id: string
  categoria_id?: string
  tipo: 'income' | 'expense' | 'adjustment'
  monto: number
  signo?: 1 | -1
  descripcion?: string
  comercio?: string
  fecha_movimiento?: string
  estado?: 'pending' | 'confirmed' | 'cancelled'
}

function invalidateSaldos(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['movimientos'] })
  qc.invalidateQueries({ queryKey: ['cuentas'] })
  qc.invalidateQueries({ queryKey: ['presupuestos'] })
}

export function useCrearMovimiento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NuevoMovimientoInput) => api.post<{ movimiento: Movimiento }>('/movimientos', input),
    onSuccess: () => invalidateSaldos(qc),
  })
}

export type EditarMovimientoInput = Partial<
  Omit<NuevoMovimientoInput, 'signo'> & { signo: 1 | -1 }
>

export function useActualizarMovimiento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, cambios }: { id: string; cambios: EditarMovimientoInput }) =>
      api.patch<{ movimiento: Movimiento }>(`/movimientos/${id}`, cambios),
    onSuccess: () => invalidateSaldos(qc),
  })
}

export function useEliminarMovimiento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ movimiento: Movimiento }>(`/movimientos/${id}`),
    onSuccess: () => invalidateSaldos(qc),
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/apiClient'
import type { Movimiento } from '@/types'

export function useMovimientos(opts?: { incluirEliminados?: boolean }) {
  const incluirEliminados = opts?.incluirEliminados ?? false
  return useQuery({
    queryKey: ['movimientos', { incluirEliminados }],
    queryFn: () =>
      api
        .get<{ movimientos: Movimiento[] }>(
          incluirEliminados ? '/movimientos?incluir_eliminados=true' : '/movimientos'
        )
        .then((r) => r.movimientos),
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

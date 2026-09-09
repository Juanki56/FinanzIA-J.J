import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/apiClient'
import type { TransaccionRecurrente } from '@/types'

export function useRecurrentes(opts?: { soloActivas?: boolean }) {
  const soloActivas = opts?.soloActivas ?? true
  return useQuery({
    queryKey: ['recurrentes', { soloActivas }],
    queryFn: () =>
      api
        .get<{ recurrentes: TransaccionRecurrente[] }>(
          soloActivas ? '/transacciones-recurrentes' : '/transacciones-recurrentes?solo_activas=false'
        )
        .then((r) => r.recurrentes),
  })
}

export type NuevaRecurrenteInput = {
  cuenta_id: string
  categoria_id?: string
  nombre: string
  descripcion?: string
  tipo: 'income' | 'expense'
  monto_estimado: number
  frecuencia: TransaccionRecurrente['frecuencia']
  intervalo?: number
  dia_del_mes?: number
  dia_de_la_semana?: number
  fecha_inicio: string
  fecha_fin?: string
  tolerancia_monto?: number
}

export function useCrearRecurrente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NuevaRecurrenteInput) =>
      api.post<{ recurrente: TransaccionRecurrente }>('/transacciones-recurrentes', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurrentes'] }),
  })
}

export type EditarRecurrenteInput = Partial<NuevaRecurrenteInput> & { activa?: boolean }

export function useActualizarRecurrente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, cambios }: { id: string; cambios: EditarRecurrenteInput }) =>
      api.patch<{ recurrente: TransaccionRecurrente }>(`/transacciones-recurrentes/${id}`, cambios),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurrentes'] }),
  })
}

export function useEliminarRecurrente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/transacciones-recurrentes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurrentes'] }),
  })
}

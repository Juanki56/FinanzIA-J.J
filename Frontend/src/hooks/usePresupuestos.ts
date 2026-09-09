import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/apiClient'
import type { Presupuesto } from '@/types'

export function usePresupuestos(opts?: { soloActivos?: boolean }) {
  const soloActivos = opts?.soloActivos ?? true
  return useQuery({
    queryKey: ['presupuestos', { soloActivos }],
    queryFn: () =>
      api
        .get<{ presupuestos: Presupuesto[] }>(
          soloActivos ? '/presupuestos' : '/presupuestos?solo_activos=false'
        )
        .then((r) => r.presupuestos),
  })
}

export type NuevoPresupuestoInput = {
  nombre: string
  categoria_id?: string
  monto_limite: number
  periodo?: Presupuesto['periodo']
  fecha_inicio: string
  fecha_fin?: string
  permitir_exceder?: boolean
}

export function useCrearPresupuesto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NuevoPresupuestoInput) => api.post<{ presupuesto: Presupuesto }>('/presupuestos', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['presupuestos'] }),
  })
}

export type EditarPresupuestoInput = Partial<NuevoPresupuestoInput> & { activo?: boolean }

export function useActualizarPresupuesto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, cambios }: { id: string; cambios: EditarPresupuestoInput }) =>
      api.patch<{ presupuesto: Presupuesto }>(`/presupuestos/${id}`, cambios),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['presupuestos'] }),
  })
}

export function useEliminarPresupuesto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/presupuestos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['presupuestos'] }),
  })
}

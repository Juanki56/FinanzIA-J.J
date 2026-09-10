import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/apiClient'
import type { AsignacionObjetivo, ObjetivoAhorro } from '@/types'

export function useObjetivos(opts?: { soloActivos?: boolean }) {
  const soloActivos = opts?.soloActivos ?? true
  return useQuery({
    queryKey: ['objetivos', { soloActivos }],
    queryFn: () =>
      api
        .get<{ objetivos: ObjetivoAhorro[] }>(
          soloActivos ? '/objetivos-ahorro' : '/objetivos-ahorro?solo_activos=false'
        )
        .then((r) => r.objetivos),
  })
}

export type NuevoObjetivoInput = {
  nombre: string
  descripcion?: string
  monto_objetivo: number
  fecha_objetivo?: string
  prioridad?: number
}

export function useCrearObjetivo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NuevoObjetivoInput) => api.post<{ objetivo: ObjetivoAhorro }>('/objetivos-ahorro', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['objetivos'] }),
  })
}

export type EditarObjetivoInput = Partial<NuevoObjetivoInput> & {
  activo?: boolean
  estado?: ObjetivoAhorro['estado']
}

export function useActualizarObjetivo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, cambios }: { id: string; cambios: EditarObjetivoInput }) =>
      api.patch<{ objetivo: ObjetivoAhorro }>(`/objetivos-ahorro/${id}`, cambios),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['objetivos'] }),
  })
}

export function useEliminarObjetivo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/objetivos-ahorro/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['objetivos'] }),
  })
}

export function useAsignaciones(objetivoId: string | undefined) {
  return useQuery({
    queryKey: ['objetivos', objetivoId, 'asignaciones'],
    queryFn: () =>
      api
        .get<{ asignaciones: AsignacionObjetivo[] }>(`/objetivos-ahorro/${objetivoId}/asignaciones`)
        .then((r) => r.asignaciones),
    enabled: !!objetivoId,
  })
}

export function useCrearAsignacion(objetivoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { cuenta_id: string; monto_asignado: number; notas?: string }) =>
      api.post<{ asignacion: AsignacionObjetivo }>(`/objetivos-ahorro/${objetivoId}/asignaciones`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['objetivos', objetivoId, 'asignaciones'] })
      qc.invalidateQueries({ queryKey: ['objetivos'] })
    },
  })
}

export type EditarAsignacionInput = Partial<{ monto_asignado: number; notas: string }>

export function useActualizarAsignacion(objetivoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ asignacionId, cambios }: { asignacionId: string; cambios: EditarAsignacionInput }) =>
      api.patch<{ asignacion: AsignacionObjetivo }>(`/objetivos-ahorro/${objetivoId}/asignaciones/${asignacionId}`, cambios),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['objetivos', objetivoId, 'asignaciones'] })
      qc.invalidateQueries({ queryKey: ['objetivos'] })
    },
  })
}

export function useEliminarAsignacion(objetivoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (asignacionId: string) =>
      api.delete<void>(`/objetivos-ahorro/${objetivoId}/asignaciones/${asignacionId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['objetivos', objetivoId, 'asignaciones'] })
      qc.invalidateQueries({ queryKey: ['objetivos'] })
    },
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/apiClient'
import type { Transferencia } from '@/types'

export function useTransferencias() {
  return useQuery({
    queryKey: ['transferencias'],
    queryFn: () => api.get<{ transferencias: Transferencia[] }>('/transferencias').then((r) => r.transferencias),
  })
}

export type NuevaTransferenciaInput = {
  cuenta_origen_id: string
  cuenta_destino_id: string
  monto: number
  descripcion?: string
  fecha_transferencia?: string
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['transferencias'] })
  qc.invalidateQueries({ queryKey: ['cuentas'] })
  qc.invalidateQueries({ queryKey: ['movimientos'] })
}

export function useCrearTransferencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NuevaTransferenciaInput) =>
      api.post<{ transferencia: Transferencia }>('/transferencias', input),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useActualizarEstadoTransferencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: 'pending' | 'completed' | 'cancelled' }) =>
      api.patch<{ transferencia: Transferencia }>(`/transferencias/${id}/estado`, { estado }),
    onSuccess: () => invalidateAll(qc),
  })
}

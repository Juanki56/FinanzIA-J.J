import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/apiClient'
import type { Cuenta } from '@/types'

export function useCuentas() {
  return useQuery({
    queryKey: ['cuentas'],
    queryFn: () => api.get<{ cuentas: Cuenta[] }>('/cuentas').then((r) => r.cuentas),
  })
}

export type NuevaCuentaInput = {
  nombre: string
  tipo: Cuenta['tipo']
  moneda?: string
  saldo_inicial?: number
  institucion?: string
  es_pasivo?: boolean
  incluir_en_saldo_total?: boolean
  limite_credito?: number
  dia_corte?: number
  dia_pago?: number
  notas?: string
}

export function useCrearCuenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NuevaCuentaInput) => api.post<{ cuenta: Cuenta }>('/cuentas', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cuentas'] }),
  })
}

export type EditarCuentaInput = Partial<Omit<NuevaCuentaInput, 'saldo_inicial'>> & { activa?: boolean }

export function useActualizarCuenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, cambios }: { id: string; cambios: EditarCuentaInput }) =>
      api.patch<{ cuenta: Cuenta }>(`/cuentas/${id}`, cambios),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cuentas'] }),
  })
}

/** Ajusta el saldo creando un movimiento 'adjustment' por la diferencia, así el
 * cambio queda registrado en Movimientos. */
export function useAjustarSaldoCuenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, saldoNuevo }: { id: string; saldoNuevo: number }) =>
      api.post<{ cuenta: Cuenta; cuadra: boolean }>(`/cuentas/${id}/ajustar-saldo`, { saldo_nuevo: saldoNuevo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cuentas'] })
      qc.invalidateQueries({ queryKey: ['movimientos'] })
    },
  })
}

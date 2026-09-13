import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/apiClient'
import type { Conexion, ResumenSincronizacion } from '@/types'

export function useConexiones() {
  return useQuery({
    queryKey: ['conexiones'],
    queryFn: () => api.get<{ conexiones: Conexion[] }>('/conexiones').then((r) => r.conexiones),
  })
}

/** Cambia la cuenta a la que se atribuyen los movimientos creados automáticamente. */
export function useActualizarConexion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, cuentaPredeterminadaId }: { id: string; cuentaPredeterminadaId: string | null }) =>
      api.patch<{ conexion: Conexion }>(`/conexiones/${id}`, { cuenta_predeterminada_id: cuentaPredeterminadaId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conexiones'] }),
  })
}

/** Dispara la sincronización de correos para esta conexión, de forma síncrona. */
export function useSincronizarConexion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<ResumenSincronizacion>(`/conexiones/${id}/sincronizar`, undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conexiones'] })
      qc.invalidateQueries({ queryKey: ['movimientos'] })
      qc.invalidateQueries({ queryKey: ['cuentas'] })
    },
  })
}

/** Pide la URL de autorización de Google. El caller debe hacer window.location.href = url. */
export function useIniciarConexionGoogle() {
  return useMutation({
    mutationFn: () => api.get<{ url: string }>('/conexiones/google'),
  })
}

export function useEliminarConexion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/conexiones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conexiones'] }),
  })
}

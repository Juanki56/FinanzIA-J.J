import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/apiClient'
import type { Conexion } from '@/types'

export function useConexiones() {
  return useQuery({
    queryKey: ['conexiones'],
    queryFn: () => api.get<{ conexiones: Conexion[] }>('/conexiones').then((r) => r.conexiones),
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

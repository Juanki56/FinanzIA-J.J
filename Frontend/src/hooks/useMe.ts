import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/apiClient'
import { useAuth } from '@/hooks/useAuth'
import type { Usuario } from '@/types'

export function useMe() {
  const { session } = useAuth()

  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<{ usuario: Usuario }>('/me').then((r) => r.usuario),
    enabled: !!session,
    retry: (failureCount, error) => {
      // 404 = todavía no existe el perfil de FinanzIA vinculado a este login.
      if (error instanceof ApiError && error.status === 404) return false
      return failureCount < 2
    },
  })
}

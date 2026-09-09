import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMe } from '@/hooks/useMe'
import { Spinner } from '@/components/ui/Spinner'
import { ApiError } from '@/lib/apiClient'
import { OnboardingWaitPage } from '@/pages/OnboardingWaitPage'
import { AppShell } from './AppShell'

export function RequireAuth() {
  const { session, loading: authLoading } = useAuth()
  const me = useMe()

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label="Cargando FinanzIA…" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (me.isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label="Cargando tu perfil…" />
      </div>
    )
  }

  if (me.isError) {
    if (me.error instanceof ApiError && me.error.status === 404) {
      return <OnboardingWaitPage />
    }
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-ink-200">No pudimos cargar tu perfil.</p>
        <p className="text-sm text-ink-500">
          {me.error instanceof Error ? me.error.message : 'Error desconocido'}
        </p>
        <button
          onClick={() => me.refetch()}
          className="mt-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return <AppShell />
}

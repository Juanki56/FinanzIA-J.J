import { Sparkles, RefreshCw, LogOut } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'

export function OnboardingWaitPage() {
  const { signOut } = useAuth()
  const qc = useQueryClient()

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-panel rounded-3xl p-8 text-center shadow-[var(--shadow-glow-violet)]"
      >
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500">
          <Sparkles className="size-8 text-white" />
        </div>
        <h1 className="font-display text-2xl text-ink-100">Preparando tu partida…</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-400">
          Ya iniciaste sesión, pero todavía no encontramos tu perfil de FinanzIA vinculado a esta
          cuenta. Esto normalmente se resuelve solo en unos segundos. Si el mensaje persiste,
          contacta a soporte para que vinculen tu cuenta.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="primary" onClick={() => qc.invalidateQueries({ queryKey: ['me'] })}>
            <RefreshCw className="size-4" />
            Reintentar
          </Button>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="size-4" />
            Cerrar sesión
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

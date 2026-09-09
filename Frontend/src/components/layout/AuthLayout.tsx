import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Gamepad2 } from 'lucide-react'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl glass-panel shadow-[var(--shadow-glow-violet)] md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden flex-col justify-between bg-gradient-to-br from-violet-600/40 via-bg-raised to-cyan-600/20 p-8 md:flex"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 shadow-[var(--shadow-glow-violet)]">
              <Gamepad2 className="size-5 text-white" />
            </div>
            <span className="font-display text-2xl text-gradient">FinanzIA</span>
          </div>
          <div>
            <h2 className="font-display text-3xl leading-tight text-ink-100">
              Sube de nivel <br /> tus finanzas 🎮
            </h2>
            <p className="mt-3 text-sm text-ink-300">
              Registra ingresos, gastos y objetivos de ahorro con una vibra que sí dan ganas de
              usar. Tu dinero, tus reglas, tu estilo.
            </p>
          </div>
          <p className="text-xs text-ink-500">
            Los números importan: cada movimiento y transferencia se muestra siempre con
            claridad total.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-8 sm:p-10"
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}

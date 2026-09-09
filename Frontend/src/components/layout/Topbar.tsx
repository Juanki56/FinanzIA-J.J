import { useState } from 'react'
import { Menu, LogOut, Flame, ChevronDown } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMe } from '@/hooks/useMe'
import { useStreak } from '@/hooks/useStreak'
import { AnimatePresence, motion } from 'framer-motion'

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { signOut } = useAuth()
  const { data: usuario } = useMe()
  const racha = useStreak()
  const [menuOpen, setMenuOpen] = useState(false)

  const inicial = usuario?.nombre?.trim()?.[0]?.toUpperCase() ?? '🎮'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-white/8 bg-bg-base/70 px-4 backdrop-blur-xl md:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-ink-300 hover:bg-white/8 md:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>

      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        {racha > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-coral-500/15 px-3 py-1.5 text-xs font-bold text-amber-300 ring-1 ring-amber-500/30">
            <Flame className="size-3.5" />
            {racha} {racha === 1 ? 'día' : 'días'} seguidos
          </div>
        )}

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/8"
          >
            <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-magenta-500 text-sm font-bold text-white">
              {inicial}
            </div>
            <span className="hidden text-sm font-medium text-ink-200 sm:block">
              {usuario?.nombre ?? 'Jugador'}
            </span>
            <ChevronDown className="size-4 text-ink-500" />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full z-20 mt-2 w-52 glass-panel rounded-xl bg-bg-raised/95 p-1.5 shadow-[var(--shadow-card)]"
                >
                  <div className="px-3 py-2 text-xs text-ink-500">{usuario?.email}</div>
                  <button
                    onClick={signOut}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-coral-400 hover:bg-coral-500/10"
                  >
                    <LogOut className="size-4" />
                    Cerrar sesión
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import { Gamepad2 } from 'lucide-react'
import { NAV_ITEMS } from './navItems'

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-5">
      <div className="flex items-center gap-2.5 px-1">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 shadow-[var(--shadow-glow-violet)]">
          <Gamepad2 className="size-5 text-white" />
        </div>
        <span className="font-display text-xl text-gradient">FinanzIA</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gradient-to-r from-violet-500/25 to-cyan-500/15 text-ink-100 ring-1 ring-violet-500/30'
                  : 'text-ink-400 hover:bg-white/5 hover:text-ink-100'
              )
            }
          >
            <Icon className="size-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs text-ink-500">
        Próximamente: captura automática con IA y Gmail ✨
      </div>
    </div>
  )
}

import { clsx } from 'clsx'
import type { ReactNode } from 'react'

type Tone = 'violet' | 'cyan' | 'mint' | 'coral' | 'amber' | 'neutral'

const toneClasses: Record<Tone, string> = {
  violet: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30',
  cyan: 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30',
  mint: 'bg-mint-500/15 text-mint-400 ring-1 ring-mint-500/30',
  coral: 'bg-coral-500/15 text-coral-400 ring-1 ring-coral-500/30',
  amber: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
  neutral: 'bg-white/8 text-ink-300 ring-1 ring-white/10',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', toneClasses[tone])}>
      {children}
    </span>
  )
}

import { Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

export function Spinner({ className, label = 'Cargando…' }: { className?: string; label?: string }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3 py-12 text-ink-400', className)}>
      <Loader2 className="size-7 animate-spin text-violet-400" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

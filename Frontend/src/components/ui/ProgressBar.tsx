import { motion } from 'framer-motion'
import { clsx } from 'clsx'

interface ProgressBarProps {
  percent: number // 0-100+, puede pasarse de 100
  colorClassName?: string
  trackClassName?: string
  height?: string
}

export function ProgressBar({ percent, colorClassName, trackClassName, height = 'h-2.5' }: ProgressBarProps) {
  const clamped = Math.min(Math.max(percent, 0), 100)
  const overBudget = percent > 100

  const barColor =
    colorClassName ??
    (overBudget
      ? 'bg-gradient-to-r from-coral-500 to-magenta-500'
      : percent >= 85
        ? 'bg-gradient-to-r from-amber-500 to-coral-400'
        : 'bg-gradient-to-r from-cyan-500 to-violet-500')

  return (
    <div className={clsx('w-full overflow-hidden rounded-full bg-white/5', height, trackClassName)}>
      <motion.div
        className={clsx('h-full rounded-full', barColor)}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ type: 'spring', stiffness: 90, damping: 20 }}
      />
    </div>
  )
}

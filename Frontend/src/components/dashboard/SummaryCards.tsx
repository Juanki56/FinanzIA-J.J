import { motion } from 'framer-motion'
import { Wallet, TrendingDown, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/utils/currency'

interface SummaryCardsProps {
  disponible: number
  deudas: number
  moneda: string
}

export function SummaryCards({ disponible, deudas, moneda }: SummaryCardsProps) {
  const neto = disponible - deudas

  const items = [
    { label: 'Total disponible', value: disponible, icon: Wallet, gradient: 'from-violet-500 to-cyan-500' },
    { label: 'Deudas activas', value: deudas, icon: TrendingDown, gradient: 'from-coral-500 to-magenta-500' },
    { label: 'Patrimonio neto', value: neto, icon: Sparkles, gradient: 'from-mint-500 to-cyan-400' },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card>
            <div className="flex items-center gap-3">
              <div className={`flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient}`}>
                <item.icon className="size-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-ink-500">{item.label}</p>
                <p className="font-tabular font-display text-xl text-ink-100">{formatCurrency(item.value, moneda)}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { Scale } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/utils/currency'
import type { TotalesPeriodo } from '@/utils/flujos'
import { COLOR_GASTO, COLOR_INGRESO } from './chartColors'
import { DeltaComparacion } from './DeltaComparacion'

interface PeriodStatsProps {
  actual: TotalesPeriodo
  anterior: TotalesPeriodo
  /** "agosto 2026", "el periodo anterior"… */
  etiquetaAnterior: string
  moneda: string
}

export function PeriodStats({ actual, anterior, etiquetaAnterior, moneda }: PeriodStatsProps) {
  const items = [
    { label: 'Ingresos', value: actual.ingresos, previo: anterior.ingresos, subirEsBueno: true, swatch: COLOR_INGRESO },
    { label: 'Gastos', value: actual.gastos, previo: anterior.gastos, subirEsBueno: false, swatch: COLOR_GASTO },
    {
      label: 'Balance del periodo',
      value: actual.ingresos - actual.gastos,
      previo: anterior.ingresos - anterior.gastos,
      subirEsBueno: true,
      swatch: null,
    },
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
          <Card className="h-full">
            <div className="flex items-center gap-2 text-sm text-ink-300">
              {item.swatch ? (
                <span className="size-2.5 rounded-full" style={{ backgroundColor: item.swatch }} aria-hidden />
              ) : (
                <Scale className="size-4 text-ink-400" aria-hidden />
              )}
              {item.label}
            </div>
            <p
              className={clsx(
                'mt-2 mb-2 font-display text-3xl leading-tight',
                item.swatch === null && item.value < 0 ? 'text-coral-400' : 'text-ink-100'
              )}
            >
              {formatCurrency(item.value, moneda)}
            </p>
            <DeltaComparacion
              actual={item.value}
              previo={item.previo}
              subirEsBueno={item.subirEsBueno}
              etiquetaAnterior={etiquetaAnterior}
              moneda={moneda}
            />
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

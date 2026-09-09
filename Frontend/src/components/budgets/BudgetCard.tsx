import { Pencil, Trash2, Target } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/utils/currency'
import { PERIODO_META } from '@/utils/meta'
import type { Categoria, Presupuesto } from '@/types'

interface BudgetCardProps {
  presupuesto: Presupuesto
  categoria?: Categoria
  moneda?: string
  onEdit?: () => void
  onDelete?: () => void
  compact?: boolean
}

export function BudgetCard({ presupuesto, categoria, moneda = 'COP', onEdit, onDelete, compact }: BudgetCardProps) {
  const porcentaje = presupuesto.monto_limite > 0 ? (presupuesto.gastado / presupuesto.monto_limite) * 100 : 0
  const excedido = presupuesto.disponible < 0

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/25 to-cyan-500/20 text-lg">
              {categoria?.icono ?? <Target className="size-5 text-violet-300" />}
            </div>
            <div>
              <h3 className="font-display text-base text-ink-100">{presupuesto.nombre}</h3>
              <p className="text-xs text-ink-500">
                {categoria ? categoria.nombre : 'Todas las categorías'} · {PERIODO_META[presupuesto.periodo]}
              </p>
            </div>
          </div>
          {!compact && (onEdit || onDelete) && (
            <div className="flex gap-1">
              {onEdit && (
                <button onClick={onEdit} className="rounded-lg p-2 text-ink-400 hover:bg-white/8 hover:text-ink-100">
                  <Pencil className="size-4" />
                </button>
              )}
              {onDelete && (
                <button onClick={onDelete} className="rounded-lg p-2 text-ink-400 hover:bg-coral-500/15 hover:text-coral-400">
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="font-tabular text-ink-200">
              {formatCurrency(presupuesto.gastado, moneda)}{' '}
              <span className="text-ink-500">de {formatCurrency(presupuesto.monto_limite, moneda)}</span>
            </span>
            <span className={`font-tabular font-semibold ${excedido ? 'text-coral-400' : 'text-ink-300'}`}>
              {porcentaje.toFixed(0)}%
            </span>
          </div>
          <ProgressBar percent={porcentaje} />
          <p className={`mt-1.5 text-xs ${excedido ? 'text-coral-400' : 'text-ink-500'}`}>
            {excedido
              ? `Te pasaste por ${formatCurrency(Math.abs(presupuesto.disponible), moneda)}${presupuesto.permitir_exceder ? ' (permitido)' : ''}`
              : `Disponible: ${formatCurrency(presupuesto.disponible, moneda)}`}
          </p>
        </div>

        {excedido && !presupuesto.permitir_exceder && <Badge tone="coral">Sobre el límite</Badge>}
      </Card>
    </motion.div>
  )
}

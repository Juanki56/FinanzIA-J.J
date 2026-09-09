import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Pencil, Trash2, Trophy } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'
import { OBJETIVO_ESTADO_META } from '@/utils/meta'
import type { ObjetivoAhorro } from '@/types'

interface GoalCardProps {
  objetivo: ObjetivoAhorro
  moneda?: string
  onEdit?: () => void
  onDelete?: () => void
}

export function GoalCard({ objetivo, moneda = 'COP', onEdit, onDelete }: GoalCardProps) {
  const porcentaje = objetivo.monto_objetivo > 0 ? (objetivo.monto_asignado / objetivo.monto_objetivo) * 100 : 0
  const completado = objetivo.estado === 'completed' || porcentaje >= 100
  const estadoMeta = OBJETIVO_ESTADO_META[objetivo.estado]

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="relative overflow-hidden">
        {completado && (
          <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-mint-500/20 blur-2xl" />
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/25 to-coral-500/20">
              <Trophy className="size-5 text-amber-300" />
            </div>
            <div>
              <Link to={`/objetivos/${objetivo.id}`} className="font-display text-base text-ink-100 hover:text-violet-300">
                {objetivo.nombre}
              </Link>
              {objetivo.fecha_objetivo && (
                <p className="text-xs text-ink-500">Meta: {formatDate(objetivo.fecha_objetivo)}</p>
              )}
            </div>
          </div>
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
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="font-tabular text-ink-200">
              {formatCurrency(objetivo.monto_asignado, moneda)}{' '}
              <span className="text-ink-500">de {formatCurrency(objetivo.monto_objetivo, moneda)}</span>
            </span>
            <span className="font-tabular font-semibold text-ink-300">{Math.min(porcentaje, 100).toFixed(0)}%</span>
          </div>
          <ProgressBar
            percent={porcentaje}
            colorClassName={completado ? 'bg-gradient-to-r from-mint-500 to-cyan-400' : undefined}
          />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <Badge tone={estadoMeta.tone}>{estadoMeta.label}</Badge>
          {!completado && <span className="text-xs text-ink-500">Faltan {formatCurrency(Math.max(objetivo.faltante, 0), moneda)}</span>}
        </div>
      </Card>
    </motion.div>
  )
}

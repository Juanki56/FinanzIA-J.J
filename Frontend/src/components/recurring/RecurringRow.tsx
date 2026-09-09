import { motion } from 'framer-motion'
import { Pencil, Repeat, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'
import { FRECUENCIA_META } from '@/utils/meta'
import type { Categoria, Cuenta, TransaccionRecurrente } from '@/types'

interface RecurringRowProps {
  recurrente: TransaccionRecurrente
  cuenta?: Cuenta
  categoria?: Categoria
  onEdit: () => void
  onDelete: () => void
}

export function RecurringRow({ recurrente, cuenta, categoria, onEdit, onDelete }: RecurringRowProps) {
  const esIngreso = recurrente.tipo === 'income'

  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-white/[0.03] ${!recurrente.activa ? 'opacity-45' : ''}`}>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-lg">
        {categoria?.icono ?? <Repeat className="size-4 text-ink-300" />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink-100">{recurrente.nombre}</p>
        <p className="truncate text-xs text-ink-500">
          {cuenta?.nombre ?? '—'} · {FRECUENCIA_META[recurrente.frecuencia]} · Próxima: {formatDate(recurrente.proxima_fecha)}
        </p>
      </div>

      {!recurrente.activa && <Badge tone="neutral">Inactiva</Badge>}

      <span className={`font-tabular w-32 shrink-0 text-right text-sm font-semibold ${esIngreso ? 'text-mint-400' : 'text-coral-400'}`}>
        {esIngreso ? '+' : '-'}
        {formatCurrency(recurrente.monto_estimado, cuenta?.moneda)}
      </span>

      <div className="flex shrink-0 gap-1">
        <button onClick={onEdit} className="rounded-lg p-2 text-ink-400 hover:bg-white/8 hover:text-ink-100">
          <Pencil className="size-4" />
        </button>
        <button onClick={onDelete} className="rounded-lg p-2 text-ink-400 hover:bg-coral-500/15 hover:text-coral-400">
          <Trash2 className="size-4" />
        </button>
      </div>
    </motion.div>
  )
}

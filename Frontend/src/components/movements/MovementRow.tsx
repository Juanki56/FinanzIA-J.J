import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, RefreshCw, Repeat, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'
import { MOVIMIENTO_ESTADO_META } from '@/utils/meta'
import type { Categoria, Cuenta, Movimiento } from '@/types'

interface MovementRowProps {
  movimiento: Movimiento
  cuenta?: Cuenta
  categoria?: Categoria
  onEdit: () => void
  onDelete: () => void
}

const ICONOS = {
  income: ArrowDownLeft,
  expense: ArrowUpRight,
  adjustment: RefreshCw,
  transfer: Repeat,
}

export function MovementRow({ movimiento, cuenta, categoria, onEdit, onDelete }: MovementRowProps) {
  const Icon = ICONOS[movimiento.tipo]
  const esTransferencia = movimiento.tipo === 'transfer'

  const monto =
    movimiento.tipo === 'expense'
      ? -Math.abs(movimiento.monto)
      : movimiento.tipo === 'adjustment'
        ? (movimiento.signo ?? 1) * Math.abs(movimiento.monto)
        : Math.abs(movimiento.monto)

  const colorMonto = monto > 0 ? 'text-mint-400' : monto < 0 ? 'text-coral-400' : 'text-ink-300'
  const estadoMeta = MOVIMIENTO_ESTADO_META[movimiento.estado]

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-white/[0.03]"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-lg">
        {categoria?.icono ?? <Icon className="size-4 text-ink-300" />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink-100">
          {movimiento.descripcion || movimiento.comercio || categoria?.nombre || (esTransferencia ? 'Transferencia' : 'Movimiento')}
        </p>
        <p className="truncate text-xs text-ink-500">
          {cuenta?.nombre ?? '—'} {categoria && !esTransferencia ? `· ${categoria.nombre}` : ''} · {formatDate(movimiento.fecha_movimiento)}
        </p>
      </div>

      <Badge tone={estadoMeta.tone}>{estadoMeta.label}</Badge>

      <span className={`font-tabular w-28 shrink-0 text-right text-sm font-semibold ${colorMonto}`}>
        {formatCurrency(monto, cuenta?.moneda)}
      </span>

      <div className="flex shrink-0 gap-1">
        {esTransferencia ? (
          <span className="px-2 text-xs text-ink-500">Ver en Transferencias</span>
        ) : (
          <>
            <button onClick={onEdit} className="rounded-lg p-2 text-ink-400 hover:bg-white/8 hover:text-ink-100">
              <Pencil className="size-4" />
            </button>
            <button onClick={onDelete} className="rounded-lg p-2 text-ink-400 hover:bg-coral-500/15 hover:text-coral-400">
              <Trash2 className="size-4" />
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}

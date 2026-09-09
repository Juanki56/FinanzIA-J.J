import { motion } from 'framer-motion'
import { ArrowRight, Ban } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'
import { TRANSFERENCIA_ESTADO_META } from '@/utils/meta'
import type { Cuenta, Transferencia } from '@/types'

interface TransferRowProps {
  transferencia: Transferencia
  origen?: Cuenta
  destino?: Cuenta
  onCancelar: () => void
}

export function TransferRow({ transferencia, origen, destino, onCancelar }: TransferRowProps) {
  const estadoMeta = TRANSFERENCIA_ESTADO_META[transferencia.estado]
  const puedeCancelar = transferencia.estado !== 'cancelled'

  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-white/[0.03]">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
        <ArrowRight className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink-100">
          {origen?.nombre ?? '—'} <ArrowRight className="inline size-3 text-ink-500" /> {destino?.nombre ?? '—'}
        </p>
        <p className="truncate text-xs text-ink-500">
          {transferencia.descripcion || 'Sin descripción'} · {formatDate(transferencia.fecha_transferencia)}
        </p>
      </div>

      <Badge tone={estadoMeta.tone}>{estadoMeta.label}</Badge>

      <span className="font-tabular w-28 shrink-0 text-right text-sm font-semibold text-cyan-300">
        {formatCurrency(transferencia.monto, origen?.moneda)}
      </span>

      <div className="w-9 shrink-0">
        {puedeCancelar && (
          <button onClick={onCancelar} className="rounded-lg p-2 text-ink-400 hover:bg-coral-500/15 hover:text-coral-400" aria-label="Cancelar transferencia">
            <Ban className="size-4" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

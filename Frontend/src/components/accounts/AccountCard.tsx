import { motion } from 'framer-motion'
import { Archive, Pencil } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/utils/currency'
import { CUENTA_TIPO_META } from '@/utils/meta'
import type { Cuenta } from '@/types'

interface AccountCardProps {
  cuenta: Cuenta
  onEdit: () => void
  onArchive: () => void
}

export function AccountCard({ cuenta, onEdit, onArchive }: AccountCardProps) {
  const meta = CUENTA_TIPO_META[cuenta.tipo]
  const Icon = meta.icon

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={!cuenta.activa ? 'opacity-50' : ''}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${meta.gradient}`}>
              <Icon className="size-5 text-white" />
            </div>
            <div>
              <h3 className="font-display text-base text-ink-100">{cuenta.nombre}</h3>
              <p className="text-xs text-ink-500">{cuenta.institucion || meta.label}</p>
            </div>
          </div>
          {!cuenta.activa && <Badge tone="neutral">Archivada</Badge>}
        </div>

        <div className="mt-4">
          <p className="text-xs text-ink-500">{cuenta.es_pasivo ? 'Deuda actual' : 'Saldo actual'}</p>
          <p className={`font-tabular font-display text-2xl ${cuenta.es_pasivo ? 'text-coral-400' : 'text-ink-100'}`}>
            {formatCurrency(cuenta.saldo_actual, cuenta.moneda)}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Badge tone={cuenta.es_pasivo ? 'coral' : 'cyan'}>{meta.label}</Badge>
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="rounded-lg p-2 text-ink-400 hover:bg-white/8 hover:text-ink-100"
              aria-label="Editar cuenta"
            >
              <Pencil className="size-4" />
            </button>
            {cuenta.activa && (
              <button
                onClick={onArchive}
                className="rounded-lg p-2 text-ink-400 hover:bg-coral-500/15 hover:text-coral-400"
                aria-label="Archivar cuenta"
              >
                <Archive className="size-4" />
              </button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

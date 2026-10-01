import { Receipt } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'
import type { Categoria, Cuenta, Movimiento } from '@/types'

interface TopExpensesProps {
  /** Gastos YA filtrados por periodo y cuenta. */
  gastos: Movimiento[]
  cuentas: Cuenta[]
  categorias: Categoria[]
  moneda: string
  limite?: number
}

export function TopExpenses({ gastos, cuentas, categorias, moneda, limite = 5 }: TopExpensesProps) {
  const top = [...gastos].sort((a, b) => Number(b.monto) - Number(a.monto)).slice(0, limite)

  if (top.length === 0) {
    return (
      <EmptyState
        icon={<Receipt className="size-6" />}
        title="Sin gastos en este periodo"
        description="Aquí aparecerán tus gastos más grandes."
      />
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-white/5">
      {top.map((mov) => {
        const cuenta = cuentas.find((c) => c.id === mov.cuenta_id)
        const categoria = categorias.find((c) => c.id === mov.categoria_id)
        return (
          <li key={mov.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="truncate text-sm text-ink-100">
                {mov.comercio || mov.descripcion || categoria?.nombre || 'Gasto'}
              </p>
              <p className="truncate text-xs text-ink-500">
                {formatDate(mov.fecha_movimiento)}
                {cuenta && ` · ${cuenta.nombre}`}
                {categoria && ` · ${categoria.icono ?? ''} ${categoria.nombre}`.trimEnd()}
                {mov.estado === 'pending' && ' · Pendiente'}
              </p>
            </div>
            <span className="shrink-0 font-tabular text-sm font-semibold text-ink-100">
              {formatCurrency(Number(mov.monto), moneda)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

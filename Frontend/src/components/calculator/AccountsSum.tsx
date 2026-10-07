import { clsx } from 'clsx'
import { Calculator } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useCuentas } from '@/hooks/useCuentas'
import { formatCurrency, formatSignedCurrency } from '@/utils/currency'
import { sumarSaldos, useSeleccionCuentas } from './useSeleccionCuentas'

interface AccountsSumProps {
  /** Lleva el total a la calculadora normal para seguir operando con él. */
  onUsarTotal: (total: number) => void
}

export function AccountsSum({ onUsarTotal }: AccountsSumProps) {
  const { data: cuentas, isLoading } = useCuentas()
  const { seleccion, cambiar, alternar } = useSeleccionCuentas()

  if (isLoading) return <Spinner />

  const activas = (cuentas ?? []).filter((c) => c.activa)
  const elegidas = activas.filter((c) => seleccion.includes(c.id))
  const total = sumarSaldos(elegidas)

  if (activas.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-400">Todavía no tienes cuentas activas.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-400">Elige las cuentas que quieres sumar</span>
        <div className="flex gap-1">
          <button type="button" onClick={() => cambiar(activas.map((c) => c.id))} className="rounded-md px-2 py-1 text-violet-300 hover:bg-white/8">
            Todas
          </button>
          <button type="button" onClick={() => cambiar([])} className="rounded-md px-2 py-1 text-ink-400 hover:bg-white/8">
            Ninguna
          </button>
        </div>
      </div>

      <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
        {activas.map((cuenta) => {
          const marcada = seleccion.includes(cuenta.id)
          return (
            <li key={cuenta.id}>
              <label
                className={clsx(
                  'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ring-1 transition',
                  marcada ? 'bg-violet-500/10 ring-violet-500/40' : 'bg-white/[0.03] ring-white/8 hover:bg-white/[0.06]'
                )}
              >
                <input type="checkbox" className="size-4 accent-violet-500" checked={marcada} onChange={() => alternar(cuenta.id)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink-100">{cuenta.nombre}</span>
                  {cuenta.es_pasivo && <span className="text-xs text-coral-400">Deuda: resta del total</span>}
                </span>
                <span className={clsx('font-tabular text-sm', cuenta.es_pasivo ? 'text-coral-400' : 'text-ink-200')}>
                  {formatCurrency(cuenta.saldo_actual, cuenta.moneda)}
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      <div className="rounded-xl bg-white/[0.04] px-4 py-3">
        <p className="text-xs text-ink-400">
          Total de {elegidas.length} cuenta{elegidas.length === 1 ? '' : 's'}
        </p>
        <p className="font-tabular font-display text-3xl text-ink-100" aria-live="polite">
          {elegidas.some((c) => c.es_pasivo) ? formatSignedCurrency(total) : formatCurrency(total)}
        </p>
      </div>

      <Button type="button" variant="secondary" disabled={elegidas.length === 0} onClick={() => onUsarTotal(total)}>
        <Calculator className="size-4" />
        Seguir calculando con este total
      </Button>
    </div>
  )
}

import { clsx } from 'clsx'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { formatCurrency } from '@/utils/currency'

interface DeltaComparacionProps {
  actual: number
  previo: number
  /** true si que el valor suba es bueno (ingresos); false si es malo (gastos). */
  subirEsBueno: boolean
  /** "agosto 2026", "1 sep – 10 sep 2026"… */
  etiquetaAnterior: string
  moneda: string
}

/**
 * Variación contra el periodo anterior: flecha + porcentaje + valor previo.
 * El color dice si el cambio es bueno o malo, y la flecha y el texto lo
 * repiten para no depender solo del color.
 */
export function DeltaComparacion({ actual, previo, subirEsBueno, etiquetaAnterior, moneda }: DeltaComparacionProps) {
  // Sin base de comparación (el anterior fue 0) no hay porcentaje: evita un "+∞%".
  const pct = previo === 0 ? null : ((actual - previo) / Math.abs(previo)) * 100
  const igual = Math.round(actual) === Math.round(previo)
  const sube = actual > previo
  const esBueno = igual ? null : sube === subirEsBueno
  const Flecha = igual ? Minus : sube ? ArrowUpRight : ArrowDownRight

  return (
    <p className="flex flex-wrap items-center gap-1 text-xs text-ink-500">
      <span
        className={clsx(
          'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold',
          esBueno === null && 'bg-white/5 text-ink-300',
          esBueno === true && 'bg-mint-500/15 text-mint-400',
          esBueno === false && 'bg-coral-500/15 text-coral-400'
        )}
      >
        <Flecha className="size-3" aria-hidden />
        {pct === null ? (igual ? 'Igual' : 'Nuevo') : `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`}
      </span>
      <span>
        vs {etiquetaAnterior} ({formatCurrency(previo, moneda)})
      </span>
    </p>
  )
}

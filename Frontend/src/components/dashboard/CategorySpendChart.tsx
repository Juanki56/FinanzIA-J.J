import { useMemo } from 'react'
import { PieChart as PieChartIcon } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/utils/currency'
import { COLOR_GASTO } from './chartColors'
import type { Categoria, Movimiento } from '@/types'

const MAX_FILAS = 7

interface CategorySpendChartProps {
  /** Gastos YA filtrados por periodo y cuenta. */
  gastos: Movimiento[]
  categorias: Categoria[]
  moneda?: string
  /** Color de las barras: coral para gastos (por defecto), cian para ingresos. */
  color?: string
  textoVacio?: string
}

/**
 * Gasto por categoría como barras horizontales ordenadas: con muchas
 * categorías se comparan mejor que en una dona, y al ser un solo color no
 * depende de distinguir tonos. Lo que no cabe se agrupa en "Otras".
 */
export function CategorySpendChart({
  gastos,
  categorias,
  moneda = 'COP',
  color = COLOR_GASTO,
  textoVacio = 'Sin gastos en este periodo',
}: CategorySpendChartProps) {
  const { filas, total } = useMemo(() => {
    const porCategoria = new Map<string, number>()
    for (const mov of gastos) {
      const key = mov.categoria_id ?? 'sin-categoria'
      porCategoria.set(key, (porCategoria.get(key) ?? 0) + Number(mov.monto))
    }

    const ordenadas = Array.from(porCategoria.entries())
      .map(([categoriaId, valor]) => {
        const cat = categorias.find((c) => c.id === categoriaId)
        return { id: categoriaId, nombre: cat?.nombre ?? 'Sin categoría', icono: cat?.icono ?? null, valor }
      })
      .sort((a, b) => b.valor - a.valor)

    const total = ordenadas.reduce((s, f) => s + f.valor, 0)
    if (ordenadas.length <= MAX_FILAS) return { filas: ordenadas, total }

    const visibles = ordenadas.slice(0, MAX_FILAS - 1)
    const resto = ordenadas.slice(MAX_FILAS - 1)
    return {
      filas: [
        ...visibles,
        {
          id: 'otras',
          nombre: `Otras (${resto.length})`,
          icono: null,
          valor: resto.reduce((s, f) => s + f.valor, 0),
        },
      ],
      total,
    }
  }, [gastos, categorias])

  if (filas.length === 0) {
    return (
      <EmptyState
        icon={<PieChartIcon className="size-6" />}
        title={textoVacio}
        description="En cuanto registres un gasto, aquí verás en qué se te va la plata."
      />
    )
  }

  const maximo = filas[0].valor

  return (
    <ul className="flex flex-col gap-3">
      {filas.map((fila) => {
        const pct = total > 0 ? (fila.valor / total) * 100 : 0
        return (
          <li key={fila.id} title={`${fila.nombre}: ${formatCurrency(fila.valor, moneda)} (${pct.toFixed(1)}%)`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-ink-200">
                {fila.icono && <span className="mr-1.5">{fila.icono}</span>}
                {fila.nombre}
              </span>
              <span className="shrink-0 font-tabular text-ink-100">
                {formatCurrency(fila.valor, moneda)}
                <span className="ml-2 inline-block w-10 text-right text-xs text-ink-500">{pct.toFixed(0)}%</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max((fila.valor / maximo) * 100, 2)}%`, backgroundColor: color }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

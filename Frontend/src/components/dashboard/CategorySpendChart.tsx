import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { PieChart as PieChartIcon } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/utils/currency'
import { dateOnlyLocal } from '@/utils/date'
import type { Categoria, Movimiento } from '@/types'

const PALETA = ['#9256ff', '#22d3ee', '#f742e0', '#2fe3a8', '#ffb703', '#fb5678', '#5ce9ff', '#ff8fa3']

interface CategorySpendChartProps {
  movimientos: Movimiento[]
  categorias: Categoria[]
  moneda?: string
}

export function CategorySpendChart({ movimientos, categorias, moneda = 'COP' }: CategorySpendChartProps) {
  const data = useMemo(() => {
    const ahora = new Date()
    const inicioMes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-01`

    const gastosDelMes = movimientos.filter(
      (m) =>
        m.tipo === 'expense' &&
        !m.eliminado &&
        m.estado !== 'cancelled' &&
        dateOnlyLocal(m.fecha_movimiento) >= inicioMes
    )

    const porCategoria = new Map<string, number>()
    for (const mov of gastosDelMes) {
      const key = mov.categoria_id ?? 'sin-categoria'
      porCategoria.set(key, (porCategoria.get(key) ?? 0) + Number(mov.monto))
    }

    return Array.from(porCategoria.entries())
      .map(([categoriaId, total]) => {
        const cat = categorias.find((c) => c.id === categoriaId)
        return { name: cat ? `${cat.icono ?? ''} ${cat.nombre}`.trim() : 'Sin categoría', value: total, color: cat?.color }
      })
      .sort((a, b) => b.value - a.value)
  }, [movimientos, categorias])

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<PieChartIcon className="size-6" />}
        title="Sin gastos este mes todavía"
        description="En cuanto registres un gasto, aquí verás en qué se te va la plata."
      />
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:items-center">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
              {data.map((entry, i) => (
                <Cell key={entry.name} fill={entry.color || PALETA[i % PALETA.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(Number(value), moneda)}
              contentStyle={{
                background: '#1b1738',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                color: '#f6f4ff',
                fontSize: 13,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-col gap-2">
        {data.slice(0, 6).map((item, i) => (
          <li key={item.name} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-ink-300">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color || PALETA[i % PALETA.length] }}
              />
              {item.name}
            </span>
            <span className="font-tabular font-medium text-ink-100">{formatCurrency(item.value, moneda)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

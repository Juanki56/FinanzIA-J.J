import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3, Table2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCompactCurrency, formatCurrency } from '@/utils/currency'
import type { PuntoSerie } from '@/utils/flujos'
import { COLOR_EJE, COLOR_GASTO, COLOR_GRID, COLOR_INGRESO } from './chartColors'

type ClaveSerie = 'ingresos' | 'gastos'

const TODAS_LAS_SERIES = [
  { key: 'ingresos', label: 'Ingresos', color: COLOR_INGRESO },
  { key: 'gastos', label: 'Gastos', color: COLOR_GASTO },
] as const

interface IncomeExpenseChartProps {
  datos: PuntoSerie[]
  moneda: string
  /** Qué series dibujar. Con una sola no hay leyenda: el título de la tarjeta la nombra. */
  series?: ClaveSerie[]
  textoVacio?: string
}

interface TooltipProps {
  active?: boolean
  payload?: { payload: PuntoSerie }[]
  moneda: string
  series: readonly (typeof TODAS_LAS_SERIES)[number][]
}

function ChartTooltip({ active, payload, moneda, series: SERIES }: TooltipProps) {
  if (!active || !payload?.length) return null
  const punto = payload[0].payload
  const balance = punto.ingresos - punto.gastos
  return (
    <div className="min-w-48 rounded-xl border border-white/10 bg-bg-card px-3 py-2.5 text-sm shadow-lg">
      <p className="mb-1.5 font-semibold capitalize text-ink-100">{punto.etiquetaLarga}</p>
      {SERIES.map((s) => (
        <p key={s.key} className="flex items-center justify-between gap-4 text-ink-300">
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
          <span className="font-tabular text-ink-100">{formatCurrency(punto[s.key], moneda)}</span>
        </p>
      ))}
      {SERIES.length > 1 && (
        <p className="mt-1.5 flex justify-between gap-4 border-t border-white/10 pt-1.5 text-ink-400">
          Balance
          <span className="font-tabular text-ink-200">{formatCurrency(balance, moneda)}</span>
        </p>
      )}
    </div>
  )
}

export function IncomeExpenseChart({
  datos,
  moneda,
  series = ['ingresos', 'gastos'],
  textoVacio = 'Sin ingresos ni gastos en este periodo',
}: IncomeExpenseChartProps) {
  const [verTabla, setVerTabla] = useState(false)
  const SERIES = TODAS_LAS_SERIES.filter((s) => series.includes(s.key))
  const conValor = (d: PuntoSerie) => SERIES.some((s) => d[s.key] > 0)
  const hayDatos = datos.some(conValor)

  if (!hayDatos) {
    return (
      <EmptyState
        icon={<BarChart3 className="size-6" />}
        title={textoVacio}
        description="Prueba con otro mes o con otra cuenta."
      />
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        {SERIES.length > 1 ? (
          <ul className="flex gap-4 text-xs text-ink-300" aria-label="Leyenda">
            {SERIES.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                {s.label}
              </li>
            ))}
          </ul>
        ) : (
          <span />
        )}
        <button
          onClick={() => setVerTabla((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-ink-400 hover:bg-white/8 hover:text-ink-200"
        >
          {verTabla ? <BarChart3 className="size-3.5" /> : <Table2 className="size-3.5" />}
          {verTabla ? 'Ver gráfico' : 'Ver tabla'}
        </button>
      </div>

      {verTabla ? (
        <div className="max-h-64 overflow-auto rounded-xl border border-white/5">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-bg-card text-left text-xs text-ink-500">
              <tr>
                <th className="px-3 py-2 font-medium">Periodo</th>
                {SERIES.map((s) => (
                  <th key={s.key} className="px-3 py-2 text-right font-medium">
                    {s.label}
                  </th>
                ))}
                {SERIES.length > 1 && <th className="px-3 py-2 text-right font-medium">Balance</th>}
              </tr>
            </thead>
            <tbody className="font-tabular">
              {datos
                .filter(conValor)
                .map((d) => (
                  <tr key={d.clave} className="border-t border-white/5 text-ink-200">
                    <td className="px-3 py-1.5 capitalize text-ink-300">{d.etiquetaLarga}</td>
                    {SERIES.map((s) => (
                      <td key={s.key} className="px-3 py-1.5 text-right">
                        {formatCurrency(d[s.key], moneda)}
                      </td>
                    ))}
                    {SERIES.length > 1 && (
                      <td className="px-3 py-1.5 text-right">{formatCurrency(d.ingresos - d.gastos, moneda)}</td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datos} barGap={2} barCategoryGap="20%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={COLOR_GRID} />
              <XAxis
                dataKey="etiqueta"
                tickLine={false}
                axisLine={{ stroke: COLOR_GRID }}
                tick={{ fill: COLOR_EJE, fontSize: 11 }}
                interval="preserveStartEnd"
                minTickGap={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: COLOR_EJE, fontSize: 11 }}
                tickFormatter={(v: number) => formatCompactCurrency(v, moneda)}
                width={64}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                content={<ChartTooltip moneda={moneda} series={SERIES} />}
              />
              {SERIES.map((s) => (
                <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={24} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

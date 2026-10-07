import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'
import { formatCurrency, formatSignedCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'
import type { ResumenFinanciero } from '@/types'
import { ResultRow } from './ResultRow'
import { ResultNotes } from './ResultNotes'

function CategoriasTop({ titulo, items }: { titulo: string; items: { categoria: string; gasto: number }[] }) {
  if (items.length === 0) return null
  const maximo = items[0]?.gasto ?? 1
  return (
    <Card>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">{titulo}</p>
      <ul className="flex flex-col gap-2">
        {items.map((c) => (
          <li key={c.categoria}>
            <div className="flex justify-between text-sm">
              <span className="text-ink-200">{c.categoria}</span>
              <span className="font-tabular text-ink-100">{formatCurrency(c.gasto)}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-white/5">
              <div className="h-full rounded-full bg-violet-500/70" style={{ width: `${(c.gasto / maximo) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** Resumen para preguntas generales: saldos, meses y categorías (todo confirmado). */
export function SummaryResult({ r }: { r: ResumenFinanciero }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Tu plata hoy</p>
          {r.saldos.cuentas
            .filter((c) => !c.es_pasivo)
            .map((c) => (
              <ResultRow key={c.nombre} etiqueta={c.es_ahorro ? `${c.nombre} · ahorro` : c.nombre} valor={formatCurrency(c.saldo)} />
            ))}
          {r.saldos.deudas > 0 && <ResultRow etiqueta="Deudas" valor={`−${formatCurrency(r.saldos.deudas)}`} tono="coral" />}
          <ResultRow etiqueta="Disponible en total" valor={formatCurrency(r.saldos.disponible)} fuerte />
        </Card>

        <Card>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Mes a mes (confirmado)</p>
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-1.5 text-sm">
            <span className="text-xs text-ink-500">Mes</span>
            <span className="text-right text-xs text-ink-500">Entró</span>
            <span className="text-right text-xs text-ink-500">Salió</span>
            <span className="text-right text-xs text-ink-500">Balance</span>
            {r.meses.map((m) => (
              <div key={m.mes} className="contents">
                <span className="capitalize text-ink-300">
                  {formatDate(`${m.mes}-01`, 'MMM yyyy')}
                  {m.en_curso && <span className="text-xs text-ink-500"> · en curso</span>}
                  {m.pendientes > 0 && <span className="text-xs text-amber-300"> · {m.pendientes} pend.</span>}
                </span>
                <span className="font-tabular text-right text-mint-400">{formatCurrency(m.ingresos)}</span>
                <span className="font-tabular text-right text-coral-400">{formatCurrency(m.gastos)}</span>
                <span className={clsx('font-tabular text-right', m.balance < 0 ? 'text-coral-400' : 'text-ink-100')}>
                  {formatSignedCurrency(m.balance)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CategoriasTop titulo="En qué gastas más este mes" items={r.categorias_mes_actual} />
        <CategoriasTop titulo="En qué gastas más (últimos meses)" items={r.categorias_periodo} />
      </div>

      <ResultNotes advertencias={r.advertencias} supuestos={r.supuestos} />
    </div>
  )
}

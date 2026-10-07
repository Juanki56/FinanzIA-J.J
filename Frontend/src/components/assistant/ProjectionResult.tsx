import { clsx } from 'clsx'
import { Target } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { formatCurrency } from '@/utils/currency'
import { formatDate, textoMeses } from '@/utils/date'
import type { ProyeccionObjetivos } from '@/types'
import { ResultNotes } from './ResultNotes'

/** "¿Cuándo alcanzo mis objetivos?": un bloque por objetivo con su proyección. */
export function ProjectionResult({ r }: { r: ProyeccionObjetivos }) {
  const origen =
    r.ritmo.fuente === 'usuario' ? 'el ahorro mensual que indicaste'
    : r.ritmo.fuente === 'calculado' ? `tu promedio de los últimos ${r.ritmo.meses_usados} meses confirmados`
    : null

  return (
    <div className="flex flex-col gap-3">
      {origen && r.ritmo.valor !== null && (
        <p className="text-sm text-ink-400">
          Ahorrando <strong className="text-ink-100">{formatCurrency(r.ritmo.valor)}</strong> al mes ({origen}).
        </p>
      )}

      {r.objetivos.map((o) => {
        const porcentaje = o.monto_objetivo > 0 ? (o.monto_asignado / o.monto_objetivo) * 100 : 0
        return (
          <Card key={o.nombre}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-display text-lg text-ink-100">
                <Target className="size-4 text-violet-300" />
                {o.nombre}
              </p>
              {o.vencido ? (
                <Badge tone="coral">La fecha ya pasó</Badge>
              ) : o.llega_a_tiempo === true ? (
                <Badge tone="mint">Llegas a tiempo</Badge>
              ) : o.llega_a_tiempo === false ? (
                <Badge tone="amber">No llegas a tiempo</Badge>
              ) : null}
            </div>
            <ProgressBar percent={porcentaje} colorClassName="bg-gradient-to-r from-violet-500 to-mint-400" />
            <p className="mt-1.5 text-xs text-ink-500">
              {formatCurrency(o.monto_asignado)} reservados de {formatCurrency(o.monto_objetivo)} · faltan {formatCurrency(o.faltante)}
              {o.fecha_objetivo && ` · meta: ${formatDate(o.fecha_objetivo)}`}
            </p>

            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-ink-500">A tu ritmo llegarías en</p>
                <p className={clsx('font-tabular', o.meses_para_llegar === null ? 'text-ink-500' : 'text-ink-100')}>
                  {o.meses_para_llegar === null
                    ? 'No se puede estimar'
                    : o.faltante === 0
                      ? '¡Ya lo completaste!'
                      : `${textoMeses(o.meses_para_llegar)} · ${formatDate(o.fecha_estimada)}`}
                </p>
              </div>
              {o.necesario_mensual !== null && (
                <div>
                  <p className="text-xs text-ink-500">Para llegar a tiempo necesitas ahorrar</p>
                  <p className="font-tabular text-ink-100">{formatCurrency(o.necesario_mensual)} al mes</p>
                </div>
              )}
            </div>
          </Card>
        )
      })}

      <ResultNotes advertencias={r.advertencias} supuestos={r.supuestos} />
    </div>
  )
}

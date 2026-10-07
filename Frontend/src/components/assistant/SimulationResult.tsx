import { clsx } from 'clsx'
import { CalendarClock, Target } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/utils/currency'
import { formatDate, textoMeses } from '@/utils/date'
import type { SimulacionGasto } from '@/types'
import { ResultRow as Fila } from './ResultRow'
import { ResultNotes } from './ResultNotes'

const ORIGEN: Record<SimulacionGasto['fondos']['origen'], string> = {
  nombradas: '',
  ahorro: 'Tus cuentas de ahorro',
  todas: 'Todo tu dinero disponible',
}

export function SimulationResult({ s }: { s: SimulacionGasto }) {
  const origenRitmo =
    s.ritmo.fuente === 'usuario'
      ? 'el ahorro mensual que escribiste'
      : s.ritmo.fuente === 'calculado'
        ? `tu promedio de los últimos ${s.ritmo.meses_usados} meses confirmados`
        : null
  const nombres = s.fondos.cuentas.map((c) => c.nombre).join(' + ')
  const deDonde = s.fondos.origen === 'nombradas' ? nombres : `${ORIGEN[s.fondos.origen]} (${nombres})`

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">Antes y después</p>
          <p className="mb-2 text-xs text-ink-400">Sale de: {deDonde}</p>
          <Fila etiqueta="Saldo actual" valor={formatCurrency(s.fondos.actual)} />
          <Fila etiqueta="Gasto simulado" valor={`−${formatCurrency(s.parametros.monto)}`} tono="coral" />
          <Fila
            etiqueta="Te quedaría"
            valor={formatCurrency(s.fondos.despues)}
            tono={s.fondos.despues < 0 ? 'coral' : undefined}
            fuerte
          />
          {s.fondos.porcentaje_que_representa !== null && (
            <p className="mt-1 text-xs text-ink-500">
              Es el {String(s.fondos.porcentaje_que_representa).replace('.', ',')}% de ese saldo.
            </p>
          )}
        </Card>

        <Card>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
            <CalendarClock className="size-3.5" />
            Recuperación
          </p>
          {s.recuperacion ? (
            <>
              <p className="font-display text-2xl text-ink-100">{textoMeses(s.recuperacion.meses)}</p>
              <p className="text-sm text-ink-400">
                ≈ {s.recuperacion.dias} días · hacia el {formatDate(s.recuperacion.fecha_estimada)}
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-400">No se puede estimar (mira las advertencias).</p>
          )}
          {origenRitmo && s.ritmo.valor !== null && (
            <p className="mt-2 text-xs text-ink-500">
              Ahorrando {formatCurrency(s.ritmo.valor)} al mes · basado en {origenRitmo}.
            </p>
          )}

          {s.recuperacion_en_plazo && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="text-sm text-ink-300">Para recuperarlo en {textoMeses(s.recuperacion_en_plazo.plazo_meses)}:</p>
              <Fila etiqueta="Ahorro adicional por mes" valor={formatCurrency(s.recuperacion_en_plazo.adicional_mensual)} />
              {s.recuperacion_en_plazo.mensual_requerido !== null && (
                <Fila etiqueta="Ahorro mensual total" valor={formatCurrency(s.recuperacion_en_plazo.mensual_requerido)} fuerte />
              )}
            </div>
          )}
        </Card>
      </div>

      {s.objetivos.lista.length > 0 && (
        <Card>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
            <Target className="size-3.5" />
            Tus objetivos
          </p>
          {s.objetivos.toca_objetivos && (
            <p className="mb-2 text-sm text-amber-300">
              Este gasto tocaría {formatCurrency(s.objetivos.monto_que_toca)} que tienes reservados para objetivos.
            </p>
          )}
          <ul className="flex flex-col gap-1.5">
            {s.objetivos.lista.map((o) => (
              <li key={o.nombre} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="text-ink-200">
                  {o.nombre}
                  {o.fecha_objetivo && <span className={clsx('ml-1 text-xs', o.vencido ? 'text-coral-400' : 'text-ink-500')}>· {formatDate(o.fecha_objetivo)}{o.vencido && ' (ya pasó)'}</span>}
                </span>
                <span className="font-tabular text-ink-400">
                  {formatCurrency(o.monto_asignado)} de {formatCurrency(o.monto_objetivo)} · faltan {formatCurrency(o.faltante)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ResultNotes advertencias={s.advertencias} supuestos={s.supuestos} />
    </div>
  )
}

import { useState } from 'react'
import { clsx } from 'clsx'
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input, Select } from '@/components/ui/Field'
import { todayISO } from '@/utils/date'
import {
  PRESETS,
  desplazarPeriodo,
  esPeriodoValido,
  etiquetaPeriodo,
  periodoDePreset,
  presetActivo,
  type Periodo,
} from '@/utils/periodo'
import type { Cuenta } from '@/types'

interface DashboardFiltersProps {
  periodo: Periodo
  onPeriodoChange: (periodo: Periodo) => void
  cuentaId: string
  onCuentaChange: (cuentaId: string) => void
  cuentas: Cuenta[]
}

const chipBase = 'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap'

export function DashboardFilters({ periodo, onPeriodoChange, cuentaId, onCuentaChange, cuentas }: DashboardFiltersProps) {
  const activo = presetActivo(periodo)
  const [personalizadoAbierto, setPersonalizadoAbierto] = useState(activo === null)
  const [borrador, setBorrador] = useState<Periodo>(periodo)

  const siguiente = desplazarPeriodo(periodo, 1)
  // No tiene sentido avanzar a un periodo que empieza en el futuro.
  const puedeAvanzar = siguiente.desde <= todayISO()

  function elegirPreset(id: (typeof PRESETS)[number]['id']) {
    setPersonalizadoAbierto(false)
    onPeriodoChange(periodoDePreset(id))
  }

  function mover(pasos: number) {
    const nuevo = desplazarPeriodo(periodo, pasos)
    setBorrador(nuevo)
    onPeriodoChange(nuevo)
  }

  function aplicarBorrador(cambio: Partial<Periodo>) {
    const nuevo = { ...borrador, ...cambio }
    setBorrador(nuevo)
    if (esPeriodoValido(nuevo)) onPeriodoChange(nuevo)
  }

  return (
    <div className="glass-panel flex flex-col gap-3 rounded-2xl p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl bg-bg-deep/60 p-1">
          <button
            onClick={() => mover(-1)}
            className="rounded-lg p-2 text-ink-300 hover:bg-white/8 hover:text-ink-100"
            aria-label="Periodo anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-36 px-1 text-center font-display text-base text-ink-100">{etiquetaPeriodo(periodo)}</span>
          <button
            onClick={() => mover(1)}
            disabled={!puedeAvanzar}
            className="rounded-lg p-2 text-ink-300 hover:bg-white/8 hover:text-ink-100 disabled:pointer-events-none disabled:opacity-30"
            aria-label="Periodo siguiente"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => elegirPreset(p.id)}
              className={clsx(
                chipBase,
                activo === p.id && !personalizadoAbierto
                  ? 'bg-violet-500/25 text-violet-200 ring-1 ring-violet-400/50'
                  : 'bg-white/5 text-ink-300 hover:bg-white/10 hover:text-ink-100'
              )}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => {
              setBorrador(periodo)
              setPersonalizadoAbierto((v) => !v)
            }}
            className={clsx(
              chipBase,
              'inline-flex items-center gap-1.5',
              personalizadoAbierto || activo === null
                ? 'bg-violet-500/25 text-violet-200 ring-1 ring-violet-400/50'
                : 'bg-white/5 text-ink-300 hover:bg-white/10 hover:text-ink-100'
            )}
          >
            <CalendarRange className="size-3.5" />
            Personalizado
          </button>
        </div>

        <div className="w-full sm:ml-auto sm:w-52">
          <Select value={cuentaId} onChange={(e) => onCuentaChange(e.target.value)} aria-label="Filtrar por cuenta">
            <option value="">Todas las cuentas</option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {personalizadoAbierto && (
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <Input
            label="Desde"
            type="date"
            value={borrador.desde}
            max={borrador.hasta}
            onChange={(e) => aplicarBorrador({ desde: e.target.value })}
          />
          <Input
            label="Hasta"
            type="date"
            value={borrador.hasta}
            min={borrador.desde}
            onChange={(e) => aplicarBorrador({ hasta: e.target.value })}
          />
        </div>
      )}
    </div>
  )
}

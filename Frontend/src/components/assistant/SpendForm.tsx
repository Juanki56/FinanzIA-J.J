import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { clsx } from 'clsx'
import { FlaskConical } from 'lucide-react'
import { Input } from '@/components/ui/Field'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { Button } from '@/components/ui/Button'
import { useCuentas } from '@/hooks/useCuentas'
import { formatCurrency } from '@/utils/currency'
import type { SimularGastoInput } from '@/hooks/useAsistente'

const schema = z.object({
  monto: z.coerce.number().positive('Escribe cuánto quieres gastar'),
  plazo_meses: z.union([z.literal(''), z.coerce.number().int('Usa meses enteros').min(1, 'Mínimo 1 mes').max(120, 'Máximo 120 meses')]).optional(),
  ahorro_mensual: z.union([z.literal(''), z.coerce.number().min(0, 'No puede ser negativo')]).optional(),
})
type Valores = z.infer<typeof schema>

interface SpendFormProps {
  /** El backend no pudo calcular el ritmo: se resalta el campo para pedirlo. */
  pedirAhorroMensual: boolean
  enviando: boolean
  onSimular: (input: SimularGastoInput, nombresCuentas: string[]) => void
}

/** Simular un gasto con campos, eligiendo de qué cuentas sale. */
export function SpendForm({ pedirAhorroMensual, enviando, onSimular }: SpendFormProps) {
  const { data: cuentas } = useCuentas()
  const disponibles = (cuentas ?? []).filter((c) => c.activa && !c.es_pasivo)
  // null = todavía no tocó nada: se usan sus cuentas de ahorro por defecto.
  const [elegidas, setElegidas] = useState<string[] | null>(null)
  const seleccion = elegidas ?? disponibles.filter((c) => c.es_ahorro).map((c) => c.id)

  const { control, register, handleSubmit, formState: { errors } } = useForm<Valores>({
    resolver: zodResolver(schema),
    defaultValues: { plazo_meses: '', ahorro_mensual: '' },
  })

  function alternar(id: string) {
    setElegidas(seleccion.includes(id) ? seleccion.filter((s) => s !== id) : [...seleccion, id])
  }

  function enviar(v: Valores) {
    onSimular(
      {
        monto: v.monto,
        ...(v.plazo_meses !== '' && v.plazo_meses !== undefined ? { plazo_meses: v.plazo_meses } : {}),
        ...(v.ahorro_mensual !== '' && v.ahorro_mensual !== undefined ? { ahorro_mensual: v.ahorro_mensual } : {}),
        ...(seleccion.length > 0 ? { cuenta_ids: seleccion } : {}),
      },
      disponibles.filter((c) => seleccion.includes(c.id)).map((c) => c.nombre)
    )
  }

  return (
    <form onSubmit={handleSubmit(enviar)} className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-sm font-medium text-ink-200">¿De qué cuentas sale?</p>
        <div className="flex flex-wrap gap-1.5">
          {disponibles.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => alternar(c.id)}
              className={clsx(
                'rounded-full px-3 py-1 text-xs ring-1 transition',
                seleccion.includes(c.id)
                  ? 'bg-violet-500/20 text-ink-100 ring-violet-500/40'
                  : 'text-ink-400 ring-white/10 hover:text-ink-200'
              )}
            >
              {c.nombre} · {formatCurrency(c.saldo_actual, c.moneda)}
            </button>
          ))}
        </div>
        {seleccion.length === 0 && (
          <p className="mt-1.5 text-xs text-ink-500">Sin elegir ninguna se usa todo tu dinero disponible.</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyInput control={control} name="monto" label="¿Cuánto gastarías?" required error={errors.monto?.message} />
        <Input
          label="¿En cuántos meses quieres recuperarlo?"
          type="number"
          min={1}
          max={120}
          placeholder="Opcional, ej. 3"
          error={errors.plazo_meses?.message}
          {...register('plazo_meses')}
        />
      </div>

      <div className={clsx('rounded-xl p-3', pedirAhorroMensual ? 'bg-amber-500/10 ring-1 ring-amber-500/40' : 'bg-white/[0.03]')}>
        <MoneyInput
          control={control}
          name="ahorro_mensual"
          label="¿Cuánto ahorras normalmente al mes?"
          hint={
            pedirAhorroMensual
              ? 'No tenemos suficientes meses confirmados para calcularlo: escribe cuánto ahorras normalmente al mes.'
              : 'Opcional: si lo dejas vacío, FinanzIA intenta calcularlo con tu historial.'
          }
          error={errors.ahorro_mensual?.message}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={enviando}>
          <FlaskConical className="size-4" />
          Simular
        </Button>
      </div>
    </form>
  )
}

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { CUENTA_TIPO_META } from '@/utils/meta'
import type { Cuenta, TipoCuenta } from '@/types'

const schema = z.object({
  nombre: z.string().min(1, 'Ponle un nombre a la cuenta'),
  tipo: z.custom<TipoCuenta>((v) => typeof v === 'string' && v.length > 0, 'Elige un tipo'),
  institucion: z.string().optional(),
  moneda: z.string().min(1, 'Requerido').max(3, 'Usa el código de 3 letras, ej. COP'),
  saldo_inicial: z.coerce.number().optional(),
  es_pasivo: z.boolean().optional(),
  incluir_en_saldo_total: z.boolean().optional(),
  limite_credito: z.union([z.coerce.number(), z.literal('')]).optional(),
  dia_corte: z.union([z.coerce.number(), z.literal('')]).optional(),
  dia_pago: z.union([z.coerce.number(), z.literal('')]).optional(),
  notas: z.string().optional(),
})
export type AccountFormValues = z.infer<typeof schema>

interface AccountFormProps {
  cuenta?: Cuenta
  monedaDefault?: string
  onSubmit: (values: AccountFormValues) => void
  onCancel: () => void
  submitting?: boolean
}

export function AccountForm({ cuenta, monedaDefault = 'COP', onSubmit, onCancel, submitting }: AccountFormProps) {
  const isEdit = !!cuenta
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(schema),
    defaultValues: cuenta
      ? {
          nombre: cuenta.nombre,
          tipo: cuenta.tipo,
          institucion: cuenta.institucion ?? '',
          moneda: cuenta.moneda,
          es_pasivo: cuenta.es_pasivo,
          incluir_en_saldo_total: cuenta.incluir_en_saldo_total ?? true,
          limite_credito: cuenta.limite_credito ?? '',
          dia_corte: cuenta.dia_corte ?? '',
          dia_pago: cuenta.dia_pago ?? '',
          notas: cuenta.notas ?? '',
        }
      : {
          moneda: monedaDefault,
          saldo_inicial: 0,
          incluir_en_saldo_total: true,
          es_pasivo: false,
        },
  })

  const tipo = watch('tipo')
  const esCredito = tipo === 'credit_card'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input label="Nombre" placeholder="Ej. Nequi, Bancolombia, Efectivo…" required error={errors.nombre?.message} {...register('nombre')} />

      <div className="grid grid-cols-2 gap-4">
        <Select label="Tipo de cuenta" required error={errors.tipo?.message} {...register('tipo')}>
          <option value="">Elige un tipo</option>
          {Object.entries(CUENTA_TIPO_META).map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.label}
            </option>
          ))}
        </Select>
        <Input label="Moneda" placeholder="COP" required error={errors.moneda?.message} {...register('moneda')} />
      </div>

      <Input label="Institución" placeholder="Opcional" error={errors.institucion?.message} {...register('institucion')} />

      {!isEdit && (
        <Input
          label="Saldo inicial"
          type="number"
          step="0.01"
          hint="No se podrá cambiar después de crear la cuenta."
          error={errors.saldo_inicial?.message}
          {...register('saldo_inicial')}
        />
      )}

      {esCredito && (
        <div className="grid grid-cols-3 gap-4">
          <Input label="Límite de crédito" type="number" step="0.01" error={errors.limite_credito?.message} {...register('limite_credito')} />
          <Input label="Día de corte" type="number" min={1} max={31} error={errors.dia_corte?.message} {...register('dia_corte')} />
          <Input label="Día de pago" type="number" min={1} max={31} error={errors.dia_pago?.message} {...register('dia_pago')} />
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-xl bg-white/[0.03] p-3">
        <label className="flex items-center gap-2 text-sm text-ink-200">
          <input type="checkbox" className="size-4 accent-violet-500" {...register('es_pasivo')} />
          Es una cuenta de deuda (tarjeta de crédito, préstamo, etc.)
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-200">
          <input type="checkbox" className="size-4 accent-violet-500" {...register('incluir_en_saldo_total')} />
          Incluir en el saldo total del dashboard
        </label>
      </div>

      <Textarea label="Notas" placeholder="Opcional" error={errors.notas?.message} {...register('notas')} />

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          {isEdit ? 'Guardar cambios' : 'Crear cuenta'}
        </Button>
      </div>
    </form>
  )
}

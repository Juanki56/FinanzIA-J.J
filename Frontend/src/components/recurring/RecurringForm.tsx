import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { buildCategoryOptions } from '@/utils/categoryTree'
import { DIAS_SEMANA, todayISO } from '@/utils/date'
import type { Categoria, Cuenta, TransaccionRecurrente } from '@/types'

const schema = z
  .object({
    cuenta_id: z.string().min(1, 'Elige una cuenta'),
    categoria_id: z.string().optional(),
    nombre: z.string().min(1, 'Ponle un nombre'),
    descripcion: z.string().optional(),
    tipo: z.enum(['income', 'expense']),
    monto_estimado: z.coerce.number().positive('Debe ser mayor a 0'),
    frecuencia: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly']),
    intervalo: z.coerce.number().min(1).optional(),
    dia_del_mes: z.coerce.number().min(1).max(31).optional(),
    dia_de_la_semana: z.coerce.number().min(0).max(6).optional(),
    fecha_inicio: z.string().min(1, 'Elige una fecha de inicio'),
    fecha_fin: z.string().optional(),
    tolerancia_monto: z.coerce.number().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    if ((data.frecuencia === 'weekly' || data.frecuencia === 'biweekly') && data.dia_de_la_semana === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Elige el día de la semana', path: ['dia_de_la_semana'] })
    }
    if (data.frecuencia === 'monthly' && data.dia_del_mes === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Elige el día del mes', path: ['dia_del_mes'] })
    }
  })
export type RecurringFormValues = z.infer<typeof schema>

interface RecurringFormProps {
  recurrente?: TransaccionRecurrente
  cuentas: Cuenta[]
  categorias: Categoria[]
  onSubmit: (values: RecurringFormValues) => void
  onCancel: () => void
  submitting?: boolean
}

export function RecurringForm({ recurrente, cuentas, categorias, onSubmit, onCancel, submitting }: RecurringFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RecurringFormValues>({
    resolver: zodResolver(schema),
    defaultValues: recurrente
      ? {
          cuenta_id: recurrente.cuenta_id,
          categoria_id: recurrente.categoria_id ?? '',
          nombre: recurrente.nombre,
          descripcion: recurrente.descripcion ?? '',
          tipo: recurrente.tipo,
          monto_estimado: recurrente.monto_estimado,
          frecuencia: recurrente.frecuencia,
          intervalo: recurrente.intervalo ?? 1,
          dia_del_mes: recurrente.dia_del_mes ?? undefined,
          dia_de_la_semana: recurrente.dia_de_la_semana ?? undefined,
          fecha_inicio: recurrente.fecha_inicio.slice(0, 10),
          fecha_fin: recurrente.fecha_fin?.slice(0, 10) ?? '',
          tolerancia_monto: recurrente.tolerancia_monto ?? undefined,
        }
      : { tipo: 'expense', frecuencia: 'monthly', fecha_inicio: todayISO(), intervalo: 1 },
  })

  const tipo = watch('tipo')
  const frecuencia = watch('frecuencia')
  const categoriaOptions = buildCategoryOptions(categorias, tipo)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <p className="rounded-xl bg-amber-500/8 px-3.5 py-2.5 text-xs text-amber-200 ring-1 ring-amber-500/20">
        Esto guarda una regla ("Netflix, $45.000, mensual") para que no se te olvide. Todavía no se
        cobra ni registra solo: es tu lista de gastos e ingresos esperados.
      </p>

      <Input label="Nombre" placeholder="Ej. Netflix, Arriendo, Nómina…" required error={errors.nombre?.message} {...register('nombre')} />

      <div className="grid grid-cols-2 gap-4">
        <Select label="Cuenta" required error={errors.cuenta_id?.message} {...register('cuenta_id')}>
          <option value="">Elige una cuenta</option>
          {cuentas.filter((c) => c.activa).map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
        <Select label="Tipo" required error={errors.tipo?.message} {...register('tipo')}>
          <option value="expense">Gasto</option>
          <option value="income">Ingreso</option>
        </Select>
      </div>

      <Select label="Categoría" hint="Opcional" error={errors.categoria_id?.message} {...register('categoria_id')}>
        <option value="">Sin categoría</option>
        {categoriaOptions.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </Select>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Monto estimado" type="number" step="0.01" required error={errors.monto_estimado?.message} {...register('monto_estimado')} />
        <Input label="Tolerancia de monto" type="number" step="0.01" hint="Opcional, para variaciones" error={errors.tolerancia_monto?.message} {...register('tolerancia_monto')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select label="Frecuencia" required error={errors.frecuencia?.message} {...register('frecuencia')}>
          <option value="daily">Diaria</option>
          <option value="weekly">Semanal</option>
          <option value="biweekly">Quincenal</option>
          <option value="monthly">Mensual</option>
          <option value="yearly">Anual</option>
        </Select>
        <Input label="Cada cuántos periodos" type="number" min={1} hint="Ej. 2 = cada 2 meses" error={errors.intervalo?.message} {...register('intervalo')} />
      </div>

      {(frecuencia === 'weekly' || frecuencia === 'biweekly') && (
        <Select label="Día de la semana" required error={errors.dia_de_la_semana?.message} {...register('dia_de_la_semana')}>
          <option value="">Elige un día</option>
          {DIAS_SEMANA.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>
      )}

      {frecuencia === 'monthly' && (
        <Input label="Día del mes" type="number" min={1} max={31} required error={errors.dia_del_mes?.message} {...register('dia_del_mes')} />
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input label="Fecha de inicio" type="date" required error={errors.fecha_inicio?.message} {...register('fecha_inicio')} />
        <Input label="Fecha de fin" type="date" hint="Opcional" error={errors.fecha_fin?.message} {...register('fecha_fin')} />
      </div>

      <Textarea label="Descripción" placeholder="Opcional" error={errors.descripcion?.message} {...register('descripcion')} />

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          {recurrente ? 'Guardar cambios' : 'Crear regla'}
        </Button>
      </div>
    </form>
  )
}

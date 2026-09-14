import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { buildCategoryOptions } from '@/utils/categoryTree'
import { dateOnlyLocal, todayISO } from '@/utils/date'
import type { Categoria, Cuenta, Movimiento } from '@/types'

const schema = z.object({
  cuenta_id: z.string().min(1, 'Elige una cuenta'),
  tipo: z.enum(['income', 'expense', 'adjustment']),
  categoria_id: z.string().optional(),
  monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
  signo: z.enum(['1', '-1']).optional(),
  descripcion: z.string().optional(),
  comercio: z.string().optional(),
  fecha_movimiento: z.string().min(1, 'Elige una fecha'),
  estado: z.enum(['pending', 'confirmed', 'cancelled']),
})
export type MovementFormValues = z.infer<typeof schema>

interface MovementFormProps {
  movimiento?: Movimiento
  cuentas: Cuenta[]
  categorias: Categoria[]
  defaultTipo?: 'income' | 'expense' | 'adjustment'
  onSubmit: (values: MovementFormValues) => void
  onCancel: () => void
  submitting?: boolean
}

export function MovementForm({
  movimiento,
  cuentas,
  categorias,
  defaultTipo = 'expense',
  onSubmit,
  onCancel,
  submitting,
}: MovementFormProps) {
  const isEdit = !!movimiento

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<MovementFormValues>({
    resolver: zodResolver(schema),
    defaultValues: movimiento
      ? {
          cuenta_id: movimiento.cuenta_id,
          tipo: movimiento.tipo === 'transfer' ? 'expense' : movimiento.tipo,
          categoria_id: movimiento.categoria_id ?? '',
          monto: movimiento.monto,
          signo: movimiento.signo === -1 ? '-1' : '1',
          descripcion: movimiento.descripcion ?? '',
          comercio: movimiento.comercio ?? '',
          fecha_movimiento: dateOnlyLocal(movimiento.fecha_movimiento),
          estado: movimiento.estado,
        }
      : {
          tipo: defaultTipo,
          fecha_movimiento: todayISO(),
          estado: 'confirmed',
          signo: '1',
        },
  })

  const tipo = watch('tipo')
  const categoriaOptions = buildCategoryOptions(categorias, tipo === 'adjustment' ? undefined : tipo)
  const cuentasActivas = cuentas.filter((c) => c.activa)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Select label="Cuenta" required disabled={isEdit} error={errors.cuenta_id?.message} {...register('cuenta_id')}>
          <option value="">Elige una cuenta</option>
          {cuentasActivas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>

        <Select label="Tipo" required disabled={isEdit} error={errors.tipo?.message} {...register('tipo')}>
          <option value="expense">Gasto</option>
          <option value="income">Ingreso</option>
          <option value="adjustment">Ajuste de saldo</option>
        </Select>
      </div>

      {tipo === 'adjustment' ? (
        <Select label="¿Sumar o restar del saldo?" required error={errors.signo?.message} {...register('signo')}>
          <option value="1">Sumar al saldo (+)</option>
          <option value="-1">Restar del saldo (−)</option>
        </Select>
      ) : (
        <Select label="Categoría" hint="Opcional, pero ayuda a tus reportes" error={errors.categoria_id?.message} {...register('categoria_id')}>
          <option value="">Sin categoría</option>
          {categoriaOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </Select>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input label="Monto" type="number" step="0.01" required error={errors.monto?.message} {...register('monto')} />
        <Input label="Fecha" type="date" required error={errors.fecha_movimiento?.message} {...register('fecha_movimiento')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Comercio" placeholder="Opcional" error={errors.comercio?.message} {...register('comercio')} />
        <Select label="Estado" required error={errors.estado?.message} {...register('estado')}>
          <option value="confirmed">Confirmado</option>
          <option value="pending">Pendiente</option>
          <option value="cancelled">Cancelado</option>
        </Select>
      </div>

      <Textarea label="Descripción" placeholder="Opcional" error={errors.descripcion?.message} {...register('descripcion')} />

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          {isEdit ? 'Guardar cambios' : '¡Anotarlo! 🎮'}
        </Button>
      </div>
    </form>
  )
}

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import type { ObjetivoAhorro } from '@/types'

const schema = z.object({
  nombre: z.string().min(1, 'Ponle un nombre a tu meta'),
  descripcion: z.string().optional(),
  monto_objetivo: z.coerce.number().positive('Debe ser mayor a 0'),
  fecha_objetivo: z.string().optional(),
  prioridad: z.coerce.number().min(1).max(5).optional(),
  estado: z.enum(['active', 'completed', 'paused', 'cancelled']).optional(),
})
export type GoalFormValues = z.infer<typeof schema>

interface GoalFormProps {
  objetivo?: ObjetivoAhorro
  onSubmit: (values: GoalFormValues) => void
  onCancel: () => void
  submitting?: boolean
}

export function GoalForm({ objetivo, onSubmit, onCancel, submitting }: GoalFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(schema),
    defaultValues: objetivo
      ? {
          nombre: objetivo.nombre,
          descripcion: objetivo.descripcion ?? '',
          monto_objetivo: objetivo.monto_objetivo,
          fecha_objetivo: objetivo.fecha_objetivo?.slice(0, 10) ?? '',
          prioridad: objetivo.prioridad,
          estado: objetivo.estado,
        }
      : { prioridad: 3 },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input label="Nombre de la meta" placeholder="Ej. Viaje a Japón, Fondo de emergencia…" required error={errors.nombre?.message} {...register('nombre')} />
      <Textarea label="Descripción" placeholder="Opcional" error={errors.descripcion?.message} {...register('descripcion')} />

      <div className="grid grid-cols-2 gap-4">
        <Input label="Monto objetivo" type="number" step="0.01" required error={errors.monto_objetivo?.message} {...register('monto_objetivo')} />
        <Input label="Fecha objetivo" type="date" hint="Opcional" error={errors.fecha_objetivo?.message} {...register('fecha_objetivo')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select label="Prioridad" hint="1 = baja, 5 = alta" error={errors.prioridad?.message} {...register('prioridad')}>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
        {objetivo && (
          <Select label="Estado" error={errors.estado?.message} {...register('estado')}>
            <option value="active">Activo</option>
            <option value="completed">Completado</option>
            <option value="paused">En pausa</option>
            <option value="cancelled">Cancelado</option>
          </Select>
        )}
      </div>

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          {objetivo ? 'Guardar cambios' : 'Crear meta 🏆'}
        </Button>
      </div>
    </form>
  )
}

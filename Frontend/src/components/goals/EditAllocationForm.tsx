import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import type { AsignacionObjetivo, Cuenta } from '@/types'

const schema = z.object({
  monto_asignado: z.coerce.number().min(0, 'No puede ser negativo'),
  notas: z.string().optional(),
})
export type EditAllocationFormValues = z.infer<typeof schema>

interface EditAllocationFormProps {
  asignacion: AsignacionObjetivo
  cuenta?: Cuenta
  onSubmit: (values: EditAllocationFormValues) => void
  onCancel: () => void
  submitting?: boolean
}

export function EditAllocationForm({ asignacion, cuenta, onSubmit, onCancel, submitting }: EditAllocationFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditAllocationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { monto_asignado: asignacion.monto_asignado, notas: asignacion.notas ?? '' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <p className="text-sm text-ink-400">
        Cuenta: <span className="font-medium text-ink-200">{cuenta?.nombre ?? 'Cuenta'}</span>{' '}
        <span className="text-xs text-ink-500">(no se puede cambiar; borra y crea otra si necesitas otra cuenta)</span>
      </p>
      <Input label="Monto reservado" type="number" step="0.01" required error={errors.monto_asignado?.message} {...register('monto_asignado')} />
      <Textarea label="Notas" placeholder="Opcional" error={errors.notas?.message} {...register('notas')} />
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          Guardar cambios
        </Button>
      </div>
    </form>
  )
}

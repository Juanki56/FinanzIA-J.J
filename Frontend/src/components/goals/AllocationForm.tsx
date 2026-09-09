import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import type { Cuenta } from '@/types'

const schema = z.object({
  cuenta_id: z.string().min(1, 'Elige una cuenta'),
  monto_asignado: z.coerce.number().min(0, 'No puede ser negativo'),
  notas: z.string().optional(),
})
export type AllocationFormValues = z.infer<typeof schema>

interface AllocationFormProps {
  cuentas: Cuenta[]
  onSubmit: (values: AllocationFormValues) => void
  onCancel: () => void
  submitting?: boolean
}

export function AllocationForm({ cuentas, onSubmit, onCancel, submitting }: AllocationFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AllocationFormValues>({ resolver: zodResolver(schema) })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <p className="rounded-xl bg-violet-500/8 px-3.5 py-2.5 text-xs text-violet-200 ring-1 ring-violet-500/20">
        Esto no mueve dinero real: es solo una anotación de cuánto de esa cuenta consideras
        reservado para esta meta.
      </p>
      <Select label="Cuenta" required error={errors.cuenta_id?.message} {...register('cuenta_id')}>
        <option value="">Elige una cuenta</option>
        {cuentas
          .filter((c) => c.activa)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
      </Select>
      <Input label="Monto reservado" type="number" step="0.01" required error={errors.monto_asignado?.message} {...register('monto_asignado')} />
      <Textarea label="Notas" placeholder="Opcional" error={errors.notas?.message} {...register('notas')} />
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          Agregar asignación
        </Button>
      </div>
    </form>
  )
}

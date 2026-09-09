import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { todayISO } from '@/utils/date'
import type { Cuenta } from '@/types'

const schema = z
  .object({
    cuenta_origen_id: z.string().min(1, 'Elige la cuenta de origen'),
    cuenta_destino_id: z.string().min(1, 'Elige la cuenta de destino'),
    monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
    descripcion: z.string().optional(),
    fecha_transferencia: z.string().min(1, 'Elige una fecha'),
  })
  .refine((data) => data.cuenta_origen_id !== data.cuenta_destino_id, {
    message: 'La cuenta de origen y destino deben ser diferentes',
    path: ['cuenta_destino_id'],
  })
export type TransferFormValues = z.infer<typeof schema>

interface TransferFormProps {
  cuentas: Cuenta[]
  onSubmit: (values: TransferFormValues) => void
  onCancel: () => void
  submitting?: boolean
}

export function TransferForm({ cuentas, onSubmit, onCancel, submitting }: TransferFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fecha_transferencia: todayISO() },
  })

  const activas = cuentas.filter((c) => c.activa)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Select label="Desde" required error={errors.cuenta_origen_id?.message} {...register('cuenta_origen_id')}>
          <option value="">Cuenta de origen</option>
          {activas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
        <Select label="Hacia" required error={errors.cuenta_destino_id?.message} {...register('cuenta_destino_id')}>
          <option value="">Cuenta de destino</option>
          {activas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Monto" type="number" step="0.01" required error={errors.monto?.message} {...register('monto')} />
        <Input label="Fecha" type="date" required error={errors.fecha_transferencia?.message} {...register('fecha_transferencia')} />
      </div>

      <Textarea label="Descripción" placeholder="Opcional" error={errors.descripcion?.message} {...register('descripcion')} />

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          Transferir 🔁
        </Button>
      </div>
    </form>
  )
}

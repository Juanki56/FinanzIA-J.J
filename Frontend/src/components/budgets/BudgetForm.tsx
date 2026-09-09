import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Select } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { todayISO } from '@/utils/date'
import type { Categoria, Presupuesto } from '@/types'

const schema = z.object({
  nombre: z.string().min(1, 'Ponle un nombre'),
  categoria_id: z.string().optional(),
  monto_limite: z.coerce.number().positive('Debe ser mayor a 0'),
  periodo: z.enum(['weekly', 'monthly', 'yearly', 'custom']),
  fecha_inicio: z.string().min(1, 'Elige una fecha de inicio'),
  fecha_fin: z.string().optional(),
  permitir_exceder: z.boolean().optional(),
})
export type BudgetFormValues = z.infer<typeof schema>

interface BudgetFormProps {
  presupuesto?: Presupuesto
  categorias: Categoria[]
  onSubmit: (values: BudgetFormValues) => void
  onCancel: () => void
  submitting?: boolean
}

export function BudgetForm({ presupuesto, categorias, onSubmit, onCancel, submitting }: BudgetFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(schema),
    defaultValues: presupuesto
      ? {
          nombre: presupuesto.nombre,
          categoria_id: presupuesto.categoria_id ?? '',
          monto_limite: presupuesto.monto_limite,
          periodo: presupuesto.periodo,
          fecha_inicio: presupuesto.fecha_inicio.slice(0, 10),
          fecha_fin: presupuesto.fecha_fin?.slice(0, 10) ?? '',
          permitir_exceder: presupuesto.permitir_exceder,
        }
      : { periodo: 'monthly', fecha_inicio: todayISO() },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input label="Nombre" placeholder="Ej. Presupuesto de Mercado" required error={errors.nombre?.message} {...register('nombre')} />

      <Select label="Categoría" hint="Déjalo vacío para un presupuesto global" error={errors.categoria_id?.message} {...register('categoria_id')}>
        <option value="">Todas las categorías (global)</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </Select>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Monto límite" type="number" step="0.01" required error={errors.monto_limite?.message} {...register('monto_limite')} />
        <Select label="Periodo" required error={errors.periodo?.message} {...register('periodo')}>
          <option value="weekly">Semanal</option>
          <option value="monthly">Mensual</option>
          <option value="yearly">Anual</option>
          <option value="custom">Personalizado</option>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Fecha de inicio" type="date" required error={errors.fecha_inicio?.message} {...register('fecha_inicio')} />
        <Input label="Fecha de fin" type="date" hint="Opcional" error={errors.fecha_fin?.message} {...register('fecha_fin')} />
      </div>

      <label className="flex items-center gap-2 rounded-xl bg-white/[0.03] p-3 text-sm text-ink-200">
        <input type="checkbox" className="size-4 accent-violet-500" {...register('permitir_exceder')} />
        Permitir excederme sin marcarlo como alerta grave
      </label>

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          {presupuesto ? 'Guardar cambios' : 'Crear presupuesto'}
        </Button>
      </div>
    </form>
  )
}

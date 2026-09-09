import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { clsx } from 'clsx'
import { Input, Select } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { EMOJI_SUGERIDOS } from '@/utils/meta'
import type { Categoria } from '@/types'

const schema = z.object({
  nombre: z.string().min(1, 'Ponle un nombre'),
  tipo: z.enum(['income', 'expense', 'both']),
  categoria_padre_id: z.string().optional(),
  icono: z.string().optional(),
  color: z.string().optional(),
})
export type CategoryFormValues = z.infer<typeof schema>

interface CategoryFormProps {
  categoria?: Categoria
  categoriasRaiz: Categoria[]
  onSubmit: (values: CategoryFormValues) => void
  onCancel: () => void
  submitting?: boolean
}

export function CategoryForm({ categoria, categoriasRaiz, onSubmit, onCancel, submitting }: CategoryFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: categoria
      ? {
          nombre: categoria.nombre,
          tipo: categoria.tipo,
          categoria_padre_id: categoria.categoria_padre_id ?? '',
          icono: categoria.icono ?? '',
          color: categoria.color ?? '#9256ff',
        }
      : { tipo: 'expense', color: '#9256ff' },
  })

  const iconoActual = watch('icono')
  const opcionesPadre = categoriasRaiz.filter((c) => c.id !== categoria?.id)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input label="Nombre" placeholder="Ej. Mercado, Transporte…" required error={errors.nombre?.message} {...register('nombre')} />

      <div className="grid grid-cols-2 gap-4">
        <Select label="Tipo" required error={errors.tipo?.message} {...register('tipo')}>
          <option value="expense">Gasto</option>
          <option value="income">Ingreso</option>
          <option value="both">Ambos</option>
        </Select>
        <Select label="Categoría padre" hint="Opcional, para crear subcategorías" error={errors.categoria_padre_id?.message} {...register('categoria_padre_id')}>
          <option value="">Ninguna (categoría principal)</option>
          {opcionesPadre.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink-200">Ícono</span>
        <div className="flex flex-wrap gap-1.5">
          {EMOJI_SUGERIDOS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setValue('icono', emoji)}
              className={clsx(
                'flex size-9 items-center justify-center rounded-lg text-lg transition-colors',
                iconoActual === emoji ? 'bg-violet-500/25 ring-2 ring-violet-400' : 'bg-white/5 hover:bg-white/10'
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-ink-200">Color</span>
        <input type="color" className="h-9 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent" {...register('color')} />
      </div>

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          {categoria ? 'Guardar cambios' : 'Crear categoría'}
        </Button>
      </div>
    </form>
  )
}

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useActualizarPerfil, useMe } from '@/hooks/useMe'
import { notifyError, notifySuccess } from '@/utils/toast'

const schema = z.object({
  nombre: z.string().min(1, 'Ponle un nombre a tu perfil'),
  moneda_principal: z.string().length(3, 'Usa un código de 3 letras, ej. COP').toUpperCase(),
  zona_horaria: z.string().min(1, 'La zona horaria es obligatoria'),
})
type FormValues = z.infer<typeof schema>

export function SettingsPage() {
  const { data: usuario, isLoading } = useMe()
  const actualizar = useActualizarPerfil()

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: usuario
      ? { nombre: usuario.nombre, moneda_principal: usuario.moneda_principal, zona_horaria: usuario.zona_horaria }
      : undefined,
  })

  function onSubmit(values: FormValues) {
    actualizar.mutate(values, {
      onSuccess: () => notifySuccess('¡Perfil actualizado! ✨'),
      onError: (err) => notifyError(err),
    })
  }

  return (
    <div>
      <PageHeader title="Configuración" description="Datos de tu perfil en FinanzIA." />

      {isLoading ? (
        <Spinner />
      ) : (
        <Card className="max-w-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Nombre" required error={errors.nombre?.message} {...register('nombre')} />
            <Input
              key={usuario?.email}
              label="Correo"
              defaultValue={usuario?.email ?? ''}
              disabled
              readOnly
              hint="El correo no se puede cambiar desde aquí."
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Moneda principal"
                placeholder="COP"
                required
                error={errors.moneda_principal?.message}
                {...register('moneda_principal')}
              />
              <Input
                label="Zona horaria"
                placeholder="America/Bogota"
                required
                error={errors.zona_horaria?.message}
                {...register('zona_horaria')}
              />
            </div>
            <div className="mt-2 flex justify-end">
              <Button type="submit" loading={actualizar.isPending} disabled={!isDirty}>
                <Save className="size-4" />
                Guardar cambios
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}

import { useState } from 'react'
import { Plus, Trophy } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { GoalCard } from '@/components/goals/GoalCard'
import { GoalForm, type GoalFormValues } from '@/components/goals/GoalForm'
import { useMe } from '@/hooks/useMe'
import { useActualizarObjetivo, useCrearObjetivo, useEliminarObjetivo, useObjetivos } from '@/hooks/useObjetivos'
import { notifyError, notifySuccess } from '@/utils/toast'
import type { ObjetivoAhorro } from '@/types'

export function GoalsPage() {
  const { data: objetivos, isLoading } = useObjetivos({ soloActivos: false })
  const { data: usuario } = useMe()
  const crear = useCrearObjetivo()
  const actualizar = useActualizarObjetivo()
  const eliminar = useEliminarObjetivo()

  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<ObjetivoAhorro | null>(null)
  const [eliminando, setEliminando] = useState<ObjetivoAhorro | null>(null)

  function abrirCrear() {
    setEditando(null)
    setModalOpen(true)
  }

  function onSubmit(values: GoalFormValues) {
    const payload = {
      nombre: values.nombre,
      descripcion: values.descripcion || undefined,
      monto_objetivo: values.monto_objetivo,
      fecha_objetivo: values.fecha_objetivo || undefined,
      prioridad: values.prioridad,
    }

    if (editando) {
      actualizar.mutate(
        { id: editando.id, cambios: { ...payload, estado: values.estado } },
        {
          onSuccess: () => {
            notifySuccess('¡Meta actualizada!')
            setModalOpen(false)
          },
          onError: (err) => notifyError(err),
        }
      )
    } else {
      crear.mutate(payload, {
        onSuccess: () => {
          notifySuccess('¡Nueva meta creada! Vamos por ese ahorro 🏆')
          setModalOpen(false)
        },
        onError: (err) => notifyError(err),
      })
    }
  }

  function confirmarEliminar() {
    if (!eliminando) return
    eliminar.mutate(eliminando.id, {
      onSuccess: () => {
        notifySuccess('Meta eliminada.')
        setEliminando(null)
      },
      onError: (err) => notifyError(err),
    })
  }

  return (
    <div>
      <PageHeader
        title="Objetivos de ahorro"
        description="Define tus metas y sigue su progreso con asignaciones desde tus cuentas."
        action={
          <Button onClick={abrirCrear}>
            <Plus className="size-4" />
            Nueva meta
          </Button>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : (objetivos ?? []).length === 0 ? (
        <EmptyState
          icon={<Trophy className="size-6" />}
          title="Todavía no tienes objetivos de ahorro"
          description="Crea una meta, como un viaje o un fondo de emergencia, y ve reservando dinero de tus cuentas para lograrla."
          action={
            <Button onClick={abrirCrear}>
              <Plus className="size-4" />
              Crear mi primera meta
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(objetivos ?? []).map((o) => (
            <GoalCard
              key={o.id}
              objetivo={o}
              moneda={usuario?.moneda_principal}
              onEdit={() => {
                setEditando(o)
                setModalOpen(true)
              }}
              onDelete={() => setEliminando(o)}
            />
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar meta' : 'Nueva meta de ahorro'}>
        <GoalForm
          objetivo={editando ?? undefined}
          onSubmit={onSubmit}
          onCancel={() => setModalOpen(false)}
          submitting={crear.isPending || actualizar.isPending}
        />
      </Modal>

      <ConfirmDialog
        open={!!eliminando}
        onClose={() => setEliminando(null)}
        onConfirm={confirmarEliminar}
        title="Eliminar meta"
        description={`"${eliminando?.nombre}" y sus asignaciones se eliminarán permanentemente. El dinero en tus cuentas no se mueve, solo se borra la anotación.`}
        confirmLabel="Eliminar"
        loading={eliminar.isPending}
      />
    </div>
  )
}

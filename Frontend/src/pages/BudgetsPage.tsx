import { useState } from 'react'
import { Plus, Target } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { BudgetCard } from '@/components/budgets/BudgetCard'
import { BudgetForm, type BudgetFormValues } from '@/components/budgets/BudgetForm'
import { useCategorias } from '@/hooks/useCategorias'
import { useMe } from '@/hooks/useMe'
import {
  useActualizarPresupuesto,
  useCrearPresupuesto,
  useEliminarPresupuesto,
  usePresupuestos,
} from '@/hooks/usePresupuestos'
import { notifyError, notifySuccess } from '@/utils/toast'
import type { Presupuesto } from '@/types'

export function BudgetsPage() {
  const { data: presupuestos, isLoading: cargandoP } = usePresupuestos({ soloActivos: false })
  const { data: categorias, isLoading: cargandoC } = useCategorias()
  const { data: usuario } = useMe()

  const crear = useCrearPresupuesto()
  const actualizar = useActualizarPresupuesto()
  const eliminar = useEliminarPresupuesto()

  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Presupuesto | null>(null)
  const [eliminando, setEliminando] = useState<Presupuesto | null>(null)

  const cargando = cargandoP || cargandoC

  function abrirCrear() {
    setEditando(null)
    setModalOpen(true)
  }

  function onSubmit(values: BudgetFormValues) {
    const payload = {
      nombre: values.nombre,
      categoria_id: values.categoria_id || undefined,
      monto_limite: values.monto_limite,
      periodo: values.periodo,
      fecha_inicio: values.fecha_inicio,
      fecha_fin: values.fecha_fin || undefined,
      permitir_exceder: values.permitir_exceder,
    }

    if (editando) {
      actualizar.mutate(
        { id: editando.id, cambios: payload },
        {
          onSuccess: () => {
            notifySuccess('¡Presupuesto actualizado!')
            setModalOpen(false)
          },
          onError: (err) => notifyError(err),
        }
      )
    } else {
      crear.mutate(payload, {
        onSuccess: () => {
          notifySuccess('¡Presupuesto creado! A cuidar ese límite 🎯')
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
        notifySuccess('Presupuesto eliminado.')
        setEliminando(null)
      },
      onError: (err) => notifyError(err),
    })
  }

  return (
    <div>
      <PageHeader
        title="Presupuestos"
        description="Ponle límite a tus gastos por categoría, o globalmente."
        action={
          <Button onClick={abrirCrear}>
            <Plus className="size-4" />
            Nuevo presupuesto
          </Button>
        }
      />

      {cargando ? (
        <Spinner />
      ) : (presupuestos ?? []).length === 0 ? (
        <EmptyState
          icon={<Target className="size-6" />}
          title="Todavía no tienes presupuestos"
          description="Crea uno para controlar cuánto gastas al mes en cada categoría."
          action={
            <Button onClick={abrirCrear}>
              <Plus className="size-4" />
              Crear el primero
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(presupuestos ?? []).map((p) => (
            <BudgetCard
              key={p.id}
              presupuesto={p}
              categoria={categorias?.find((c) => c.id === p.categoria_id)}
              moneda={usuario?.moneda_principal}
              onEdit={() => {
                setEditando(p)
                setModalOpen(true)
              }}
              onDelete={() => setEliminando(p)}
            />
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar presupuesto' : 'Nuevo presupuesto'}>
        <BudgetForm
          presupuesto={editando ?? undefined}
          categorias={categorias ?? []}
          onSubmit={onSubmit}
          onCancel={() => setModalOpen(false)}
          submitting={crear.isPending || actualizar.isPending}
        />
      </Modal>

      <ConfirmDialog
        open={!!eliminando}
        onClose={() => setEliminando(null)}
        onConfirm={confirmarEliminar}
        title="Eliminar presupuesto"
        description={`"${eliminando?.nombre}" se eliminará permanentemente. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={eliminar.isPending}
      />
    </div>
  )
}

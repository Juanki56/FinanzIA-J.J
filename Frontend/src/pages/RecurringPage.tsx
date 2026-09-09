import { useMemo, useState } from 'react'
import { Plus, Repeat } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { RecurringForm, type RecurringFormValues } from '@/components/recurring/RecurringForm'
import { RecurringRow } from '@/components/recurring/RecurringRow'
import { useCuentas } from '@/hooks/useCuentas'
import { useCategorias } from '@/hooks/useCategorias'
import {
  useActualizarRecurrente,
  useCrearRecurrente,
  useEliminarRecurrente,
  useRecurrentes,
} from '@/hooks/useRecurrentes'
import { notifyError, notifySuccess } from '@/utils/toast'
import type { TransaccionRecurrente } from '@/types'

export function RecurringPage() {
  const { data: recurrentes, isLoading: cargandoR } = useRecurrentes({ soloActivas: false })
  const { data: cuentas, isLoading: cargandoC } = useCuentas()
  const { data: categorias, isLoading: cargandoCat } = useCategorias()

  const crear = useCrearRecurrente()
  const actualizar = useActualizarRecurrente()
  const eliminar = useEliminarRecurrente()

  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<TransaccionRecurrente | null>(null)
  const [eliminando, setEliminando] = useState<TransaccionRecurrente | null>(null)

  const cargando = cargandoR || cargandoC || cargandoCat
  const cuentaPorId = useMemo(() => new Map((cuentas ?? []).map((c) => [c.id, c])), [cuentas])
  const categoriaPorId = useMemo(() => new Map((categorias ?? []).map((c) => [c.id, c])), [categorias])

  function abrirCrear() {
    setEditando(null)
    setModalOpen(true)
  }

  function onSubmit(values: RecurringFormValues) {
    const payload = {
      cuenta_id: values.cuenta_id,
      categoria_id: values.categoria_id || undefined,
      nombre: values.nombre,
      descripcion: values.descripcion || undefined,
      tipo: values.tipo,
      monto_estimado: values.monto_estimado,
      frecuencia: values.frecuencia,
      intervalo: values.intervalo,
      dia_del_mes: values.dia_del_mes,
      dia_de_la_semana: values.dia_de_la_semana,
      fecha_inicio: values.fecha_inicio,
      fecha_fin: values.fecha_fin || undefined,
      tolerancia_monto: values.tolerancia_monto,
    }

    if (editando) {
      actualizar.mutate(
        { id: editando.id, cambios: payload },
        {
          onSuccess: () => {
            notifySuccess('¡Regla actualizada!')
            setModalOpen(false)
          },
          onError: (err) => notifyError(err),
        }
      )
    } else {
      crear.mutate(payload, {
        onSuccess: () => {
          notifySuccess('¡Regla creada! No se te va a olvidar más 🔁')
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
        notifySuccess('Regla eliminada.')
        setEliminando(null)
      },
      onError: (err) => notifyError(err),
    })
  }

  return (
    <div>
      <PageHeader
        title="Transacciones recurrentes"
        description="Tus gastos e ingresos esperados: Netflix, arriendo, nómina… Todavía no se registran solos."
        action={
          <Button onClick={abrirCrear}>
            <Plus className="size-4" />
            Nueva regla
          </Button>
        }
      />

      {cargando ? (
        <Spinner />
      ) : (recurrentes ?? []).length === 0 ? (
        <EmptyState
          icon={<Repeat className="size-6" />}
          title="Sin transacciones recurrentes"
          description="Anota lo que se repite cada mes o semana para no perderle la pista."
          action={
            <Button onClick={abrirCrear}>
              <Plus className="size-4" />
              Crear la primera
            </Button>
          }
        />
      ) : (
        <Card className="divide-y divide-white/5 p-2">
          {(recurrentes ?? []).map((r) => (
            <RecurringRow
              key={r.id}
              recurrente={r}
              cuenta={cuentaPorId.get(r.cuenta_id)}
              categoria={r.categoria_id ? categoriaPorId.get(r.categoria_id) : undefined}
              onEdit={() => {
                setEditando(r)
                setModalOpen(true)
              }}
              onDelete={() => setEliminando(r)}
            />
          ))}
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar regla' : 'Nueva transacción recurrente'} maxWidth="max-w-xl">
        <RecurringForm
          recurrente={editando ?? undefined}
          cuentas={cuentas ?? []}
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
        title="Eliminar regla"
        description={`"${eliminando?.nombre}" dejará de recordarte este gasto o ingreso. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={eliminar.isPending}
      />
    </div>
  )
}

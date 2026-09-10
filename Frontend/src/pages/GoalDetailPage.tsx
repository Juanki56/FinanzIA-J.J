import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Trash2, Trophy, Wallet } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Confetti } from '@/components/ui/Confetti'
import { AllocationForm, type AllocationFormValues } from '@/components/goals/AllocationForm'
import { EditAllocationForm, type EditAllocationFormValues } from '@/components/goals/EditAllocationForm'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'
import { OBJETIVO_ESTADO_META } from '@/utils/meta'
import { useCuentas } from '@/hooks/useCuentas'
import { useMe } from '@/hooks/useMe'
import {
  useAsignaciones,
  useActualizarAsignacion,
  useCrearAsignacion,
  useEliminarAsignacion,
  useObjetivos,
} from '@/hooks/useObjetivos'
import { notifyError, notifySuccess } from '@/utils/toast'
import type { AsignacionObjetivo } from '@/types'

export function GoalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: objetivos, isLoading: cargandoObjetivo } = useObjetivos({ soloActivos: false })
  const { data: asignaciones, isLoading: cargandoAsign } = useAsignaciones(id)
  const { data: cuentas } = useCuentas()
  const { data: usuario } = useMe()

  const crearAsignacion = useCrearAsignacion(id ?? '')
  const actualizarAsignacion = useActualizarAsignacion(id ?? '')
  const eliminarAsignacion = useEliminarAsignacion(id ?? '')

  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<AsignacionObjetivo | null>(null)
  const [eliminando, setEliminando] = useState<AsignacionObjetivo | null>(null)

  const objetivo = objetivos?.find((o) => o.id === id)
  const cuentaPorId = new Map((cuentas ?? []).map((c) => [c.id, c]))

  const porcentaje = objetivo && objetivo.monto_objetivo > 0 ? (objetivo.monto_asignado / objetivo.monto_objetivo) * 100 : 0
  const completado = porcentaje >= 100

  function onSubmit(values: AllocationFormValues) {
    crearAsignacion.mutate(
      { cuenta_id: values.cuenta_id, monto_asignado: values.monto_asignado, notas: values.notas || undefined },
      {
        onSuccess: () => {
          notifySuccess('¡Asignación agregada!')
          setModalOpen(false)
        },
        onError: (err) => notifyError(err),
      }
    )
  }

  function onSubmitEditar(values: EditAllocationFormValues) {
    if (!editando) return
    actualizarAsignacion.mutate(
      { asignacionId: editando.id, cambios: { monto_asignado: values.monto_asignado, notas: values.notas || undefined } },
      {
        onSuccess: () => {
          notifySuccess('¡Asignación actualizada!')
          setEditando(null)
        },
        onError: (err) => notifyError(err),
      }
    )
  }

  function confirmarEliminar() {
    if (!eliminando) return
    eliminarAsignacion.mutate(eliminando.id, {
      onSuccess: () => {
        notifySuccess('Asignación eliminada.')
        setEliminando(null)
      },
      onError: (err) => notifyError(err),
    })
  }

  if (cargandoObjetivo) return <Spinner />

  if (!objetivo) {
    return (
      <EmptyState
        icon={<Trophy className="size-6" />}
        title="No encontramos esa meta"
        description="Puede que haya sido eliminada."
        action={
          <Link to="/objetivos">
            <Button size="sm">Volver a objetivos</Button>
          </Link>
        }
      />
    )
  }

  const estadoMeta = OBJETIVO_ESTADO_META[objetivo.estado]
  const moneda = usuario?.moneda_principal

  return (
    <div>
      <button onClick={() => navigate('/objetivos')} className="mb-4 flex items-center gap-1.5 text-sm text-ink-400 hover:text-ink-200">
        <ArrowLeft className="size-4" />
        Volver a objetivos
      </button>

      <Card className="relative mb-6 overflow-hidden">
        {completado && <Confetti />}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/25 to-coral-500/20">
              <Trophy className="size-6 text-amber-300" />
            </div>
            <div>
              <h1 className="font-display text-2xl text-ink-100">{objetivo.nombre}</h1>
              {objetivo.descripcion && <p className="text-sm text-ink-400">{objetivo.descripcion}</p>}
            </div>
          </div>
          <Badge tone={estadoMeta.tone}>{estadoMeta.label}</Badge>
        </div>

        <div className="mt-6">
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="font-tabular text-ink-200">
              {formatCurrency(objetivo.monto_asignado, moneda)}{' '}
              <span className="text-ink-500">de {formatCurrency(objetivo.monto_objetivo, moneda)}</span>
            </span>
            <span className="font-tabular font-semibold text-ink-100">{Math.min(porcentaje, 100).toFixed(0)}%</span>
          </div>
          <ProgressBar percent={porcentaje} height="h-3" colorClassName={completado ? 'bg-gradient-to-r from-mint-500 to-cyan-400' : undefined} />
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-500">
            {objetivo.fecha_objetivo && <span>Meta para: {formatDate(objetivo.fecha_objetivo)}</span>}
            <span>Prioridad: {objetivo.prioridad}/5</span>
            {!completado && <span>Faltan: {formatCurrency(Math.max(objetivo.faltante, 0), moneda)}</span>}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Asignaciones desde tus cuentas</CardTitle>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="size-4" />
            Asignar
          </Button>
        </CardHeader>

        {cargandoAsign ? (
          <Spinner />
        ) : (asignaciones ?? []).length === 0 ? (
          <EmptyState
            icon={<Wallet className="size-6" />}
            title="Sin asignaciones todavía"
            description="Reserva mentalmente dinero de tus cuentas para esta meta."
            action={
              <Button size="sm" onClick={() => setModalOpen(true)}>
                <Plus className="size-4" />
                Agregar la primera
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-white/5">
            {(asignaciones ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-ink-100">{cuentaPorId.get(a.cuenta_id)?.nombre ?? 'Cuenta'}</p>
                  {a.notas && <p className="text-xs text-ink-500">{a.notas}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-tabular text-sm font-semibold text-mint-400">{formatCurrency(a.monto_asignado, moneda)}</span>
                  <button onClick={() => setEditando(a)} className="rounded-lg p-2 text-ink-400 hover:bg-white/8 hover:text-ink-100">
                    <Pencil className="size-4" />
                  </button>
                  <button onClick={() => setEliminando(a)} className="rounded-lg p-2 text-ink-400 hover:bg-coral-500/15 hover:text-coral-400">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva asignación">
        <AllocationForm cuentas={cuentas ?? []} onSubmit={onSubmit} onCancel={() => setModalOpen(false)} submitting={crearAsignacion.isPending} />
      </Modal>

      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar asignación">
        {editando && (
          <EditAllocationForm
            asignacion={editando}
            cuenta={cuentaPorId.get(editando.cuenta_id)}
            onSubmit={onSubmitEditar}
            onCancel={() => setEditando(null)}
            submitting={actualizarAsignacion.isPending}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!eliminando}
        onClose={() => setEliminando(null)}
        onConfirm={confirmarEliminar}
        title="Eliminar asignación"
        description="Se quitará esta reserva mental de la meta. El dinero sigue estando en la cuenta, solo se borra la anotación."
        confirmLabel="Eliminar"
        loading={eliminarAsignacion.isPending}
      />
    </div>
  )
}

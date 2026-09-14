import { useMemo, useState } from 'react'
import { Plus, ArrowLeftRight, Info } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TransferForm, type TransferFormValues } from '@/components/transfers/TransferForm'
import { TransferRow } from '@/components/transfers/TransferRow'
import { useCuentas } from '@/hooks/useCuentas'
import { useCrearTransferencia, useActualizarEstadoTransferencia, useTransferencias } from '@/hooks/useTransferencias'
import { notifyError, notifySuccess } from '@/utils/toast'
import { localDateInputToUtcIso } from '@/utils/date'
import type { Transferencia } from '@/types'

export function TransfersPage() {
  const { data: transferencias, isLoading: cargandoT } = useTransferencias()
  const { data: cuentas, isLoading: cargandoC } = useCuentas()
  const crear = useCrearTransferencia()
  const actualizarEstado = useActualizarEstadoTransferencia()

  const [modalOpen, setModalOpen] = useState(false)
  const [cancelando, setCancelando] = useState<Transferencia | null>(null)

  const cuentaPorId = useMemo(() => new Map((cuentas ?? []).map((c) => [c.id, c])), [cuentas])
  const cargando = cargandoT || cargandoC

  function onSubmit(values: TransferFormValues) {
    crear.mutate(
      {
        ...values,
        descripcion: values.descripcion || undefined,
        fecha_transferencia: localDateInputToUtcIso(values.fecha_transferencia),
      },
      {
        onSuccess: () => {
          notifySuccess('¡Transferencia realizada! 🔁')
          setModalOpen(false)
        },
        onError: (err) => notifyError(err),
      }
    )
  }

  function confirmarCancelar() {
    if (!cancelando) return
    actualizarEstado.mutate(
      { id: cancelando.id, estado: 'cancelled' },
      {
        onSuccess: () => {
          notifySuccess('Transferencia cancelada. El dinero volvió a las cuentas.')
          setCancelando(null)
        },
        onError: (err) => notifyError(err),
      }
    )
  }

  return (
    <div>
      <PageHeader
        title="Transferencias"
        description="Mueve dinero entre tus propias cuentas."
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="size-4" />
            Nueva transferencia
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-xl bg-cyan-500/8 px-4 py-3 text-sm text-cyan-200 ring-1 ring-cyan-500/20">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          Una vez creada, una transferencia no se puede editar. Si te equivocaste, cancélala (el
          dinero vuelve a las cuentas) y crea una nueva con los datos correctos.
        </p>
      </div>

      {cargando ? (
        <Spinner />
      ) : (transferencias ?? []).length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight className="size-6" />}
          title="Todavía no has hecho transferencias"
          description="Mueve dinero entre tus cuentas, por ejemplo de tu banco a tu billetera digital."
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="size-4" />
              Hacer la primera
            </Button>
          }
        />
      ) : (
        <Card className="divide-y divide-white/5 p-2">
          {(transferencias ?? []).map((t) => (
            <TransferRow
              key={t.id}
              transferencia={t}
              origen={cuentaPorId.get(t.cuenta_origen_id)}
              destino={cuentaPorId.get(t.cuenta_destino_id)}
              onCancelar={() => setCancelando(t)}
            />
          ))}
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva transferencia">
        <TransferForm
          cuentas={cuentas ?? []}
          onSubmit={onSubmit}
          onCancel={() => setModalOpen(false)}
          submitting={crear.isPending}
        />
      </Modal>

      <ConfirmDialog
        open={!!cancelando}
        onClose={() => setCancelando(null)}
        onConfirm={confirmarCancelar}
        title="Cancelar transferencia"
        description="Cancelar esta transferencia devolverá el dinero a las cuentas de origen y destino, revirtiendo su efecto en los saldos."
        confirmLabel="Sí, cancelar"
        loading={actualizarEstado.isPending}
      />
    </div>
  )
}

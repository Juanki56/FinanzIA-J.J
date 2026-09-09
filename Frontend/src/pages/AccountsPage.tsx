import { useState } from 'react'
import { Plus, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { AccountCard } from '@/components/accounts/AccountCard'
import { AccountForm, type AccountFormValues } from '@/components/accounts/AccountForm'
import { useActualizarCuenta, useCrearCuenta, useCuentas, type EditarCuentaInput, type NuevaCuentaInput } from '@/hooks/useCuentas'
import { useMe } from '@/hooks/useMe'
import { notifyError, notifySuccess } from '@/utils/toast'
import type { Cuenta } from '@/types'

function limpiarNumero(value: number | '' | undefined) {
  return value === '' || value === undefined ? undefined : Number(value)
}

export function AccountsPage() {
  const { data: cuentas, isLoading } = useCuentas()
  const { data: usuario } = useMe()
  const crear = useCrearCuenta()
  const actualizar = useActualizarCuenta()

  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Cuenta | null>(null)
  const [archivando, setArchivando] = useState<Cuenta | null>(null)
  const [verArchivadas, setVerArchivadas] = useState(false)

  function abrirCrear() {
    setEditando(null)
    setModalOpen(true)
  }

  function abrirEditar(cuenta: Cuenta) {
    setEditando(cuenta)
    setModalOpen(true)
  }

  function onSubmit(values: AccountFormValues) {
    const base = {
      nombre: values.nombre,
      tipo: values.tipo,
      moneda: values.moneda,
      institucion: values.institucion || undefined,
      es_pasivo: values.es_pasivo,
      incluir_en_saldo_total: values.incluir_en_saldo_total,
      limite_credito: limpiarNumero(values.limite_credito as number | ''),
      dia_corte: limpiarNumero(values.dia_corte as number | ''),
      dia_pago: limpiarNumero(values.dia_pago as number | ''),
      notas: values.notas || undefined,
    }

    if (editando) {
      const cambios: EditarCuentaInput = base
      actualizar.mutate(
        { id: editando.id, cambios },
        {
          onSuccess: () => {
            notifySuccess('¡Cuenta actualizada! ✨')
            setModalOpen(false)
          },
          onError: (err) => notifyError(err),
        }
      )
    } else {
      const input: NuevaCuentaInput = { ...base, saldo_inicial: values.saldo_inicial ?? 0 }
      crear.mutate(input, {
        onSuccess: () => {
          notifySuccess('¡Cuenta creada! Ya puedes registrar movimientos 🎮')
          setModalOpen(false)
        },
        onError: (err) => notifyError(err),
      })
    }
  }

  function confirmarArchivar() {
    if (!archivando) return
    actualizar.mutate(
      { id: archivando.id, cambios: { activa: false } },
      {
        onSuccess: () => {
          notifySuccess('Cuenta archivada. Sigue disponible en tu historial.')
          setArchivando(null)
        },
        onError: (err) => notifyError(err),
      }
    )
  }

  const visibles = (cuentas ?? []).filter((c) => verArchivadas || c.activa)

  return (
    <div>
      <PageHeader
        title="Tus cuentas"
        description="Todo lo que tienes: efectivo, bancos, billeteras, tarjetas y más."
        action={
          <Button onClick={abrirCrear}>
            <Plus className="size-4" />
            Nueva cuenta
          </Button>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : visibles.length === 0 ? (
        <EmptyState
          icon={<Wallet className="size-6" />}
          title="Todavía no tienes cuentas"
          description="Crea tu primera cuenta para empezar a registrar tus movimientos."
          action={
            <Button onClick={abrirCrear}>
              <Plus className="size-4" />
              Crear mi primera cuenta
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibles.map((cuenta) => (
              <AccountCard
                key={cuenta.id}
                cuenta={cuenta}
                onEdit={() => abrirEditar(cuenta)}
                onArchive={() => setArchivando(cuenta)}
              />
            ))}
          </div>
          {(cuentas ?? []).some((c) => !c.activa) && (
            <button
              onClick={() => setVerArchivadas((v) => !v)}
              className="mt-4 text-sm text-ink-500 hover:text-ink-300"
            >
              {verArchivadas ? 'Ocultar cuentas archivadas' : 'Ver cuentas archivadas'}
            </button>
          )}
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? 'Editar cuenta' : 'Nueva cuenta'}
      >
        <AccountForm
          cuenta={editando ?? undefined}
          monedaDefault={usuario?.moneda_principal}
          onSubmit={onSubmit}
          onCancel={() => setModalOpen(false)}
          submitting={crear.isPending || actualizar.isPending}
        />
      </Modal>

      <ConfirmDialog
        open={!!archivando}
        onClose={() => setArchivando(null)}
        onConfirm={confirmarArchivar}
        title="Archivar cuenta"
        description={`"${archivando?.nombre}" dejará de aparecer en tus totales y formularios, pero su historial se conserva. Podrás reactivarla más adelante.`}
        confirmLabel="Archivar"
        loading={actualizar.isPending}
      />
    </div>
  )
}

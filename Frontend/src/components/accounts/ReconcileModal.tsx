import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { CircleCheck, TriangleAlert } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { Button } from '@/components/ui/Button'
import { useAjustarSaldoCuenta } from '@/hooks/useCuentas'
import { formatCurrency, formatSignedCurrency } from '@/utils/currency'
import { notifyError, notifySuccess } from '@/utils/toast'
import type { Cuenta } from '@/types'

interface ReconcileModalProps {
  cuenta: Cuenta | null
  onClose: () => void
}

/**
 * "Cuadrar con el banco": el usuario escribe el saldo real que le muestra el
 * banco, ve la diferencia antes de tocar nada y, si la acepta, queda un ajuste
 * por esa diferencia (lo que el banco cobró o abonó sin avisar por correo).
 */
export function ReconcileModal({ cuenta, onClose }: ReconcileModalProps) {
  return (
    <Modal open={!!cuenta} onClose={onClose} title="Cuadrar con el banco" maxWidth="max-w-md">
      {cuenta && <Contenido key={cuenta.id} cuenta={cuenta} onClose={onClose} />}
    </Modal>
  )
}

function Contenido({ cuenta, onClose }: { cuenta: Cuenta; onClose: () => void }) {
  const ajustar = useAjustarSaldoCuenta()
  const { control, watch, handleSubmit } = useForm<{ saldoBanco: number | '' }>({ defaultValues: { saldoBanco: '' } })

  const saldoBanco = watch('saldoBanco')
  const hayValor = saldoBanco !== '' && saldoBanco !== undefined && !Number.isNaN(Number(saldoBanco))
  // Redondeo a centavos, igual que el backend, para no ver diferencias fantasma.
  const diferencia = hayValor ? Math.round((Number(saldoBanco) - cuenta.saldo_actual) * 100) / 100 : 0
  const pendientes = cuenta.pendientes?.cantidad ?? 0

  function cuadrar() {
    if (!hayValor || diferencia === 0) return
    ajustar.mutate(
      { id: cuenta.id, saldoNuevo: Number(saldoBanco) },
      {
        onSuccess: ({ cuadra }) => {
          if (cuadra) notifySuccess('¡Listo! La cuenta cuadra con el banco ✅')
          else notifyError(null, 'Se registró el ajuste, pero el saldo no quedó en el valor esperado. Revisa la cuenta.')
          onClose()
        },
        onError: (err) => notifyError(err),
      }
    )
  }

  return (
    <form onSubmit={handleSubmit(cuadrar)} className="flex flex-col gap-4">
      <div className="rounded-xl bg-white/[0.04] px-4 py-3">
        <p className="text-xs text-ink-400">Saldo en FinanzIA · {cuenta.nombre}</p>
        <p className="font-tabular font-display text-2xl text-ink-100">{formatCurrency(cuenta.saldo_actual, cuenta.moneda)}</p>
      </div>

      <MoneyInput
        control={control}
        name="saldoBanco"
        permitirNegativo
        autoFocus
        label="Saldo que te muestra el banco"
        hint="Sin contar bolsillos, si los manejas como cuentas aparte."
      />

      {pendientes > 0 && (
        <p className="flex gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          <TriangleAlert className="size-4 shrink-0" />
          <span>
            Tienes {pendientes} movimiento{pendientes === 1 ? '' : 's'} sin confirmar en esta cuenta.{' '}
            <Link to="/revisar" onClick={onClose} className="underline">
              Confírmalos primero
            </Link>
            : si no, el ajuste los absorbe y no aparecerán en tus reportes.
          </span>
        </p>
      )}

      {hayValor &&
        (diferencia === 0 ? (
          <p className="flex items-center gap-2 rounded-lg bg-mint-500/10 px-3 py-2 text-sm text-mint-400">
            <CircleCheck className="size-4" />
            ¡Ya cuadra! No hay nada que ajustar.
          </p>
        ) : (
          <div className="rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-ink-200">
            <p>
              Diferencia:{' '}
              <strong className={diferencia > 0 ? 'text-mint-400' : 'text-coral-400'}>
                {formatSignedCurrency(diferencia, cuenta.moneda)}
              </strong>
            </p>
            <p className="mt-1 text-xs text-ink-400">
              {diferencia < 0
                ? 'El banco tiene menos: suele ser una comisión de retiro, un cobro o un gasto que no se registró.'
                : 'El banco tiene más: suele ser un abono de intereses o un ingreso que no se registró.'}{' '}
              Se registrará como un ajuste de saldo en Movimientos.
            </p>
          </div>
        ))}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!hayValor || diferencia === 0} loading={ajustar.isPending}>
          Cuadrar
        </Button>
      </div>
    </form>
  )
}

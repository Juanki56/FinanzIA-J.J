import { useState } from 'react'
import { MailQuestion, Plus, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { MovementForm, type MovementFormValues } from '@/components/movements/MovementForm'
import { useCorreosSinReconocer, useDescartarCorreo } from '@/hooks/useConexiones'
import { useCrearMovimiento } from '@/hooks/useMovimientos'
import { useCategorias } from '@/hooks/useCategorias'
import { dateOnlyLocal, formatDateTime, localDateInputToUtcIso } from '@/utils/date'
import { notifyError, notifySuccess } from '@/utils/toast'
import type { Cuenta, FuenteMovimiento } from '@/types'

interface UnrecognizedEmailsCardProps {
  cuentas: Cuenta[]
  cuentaPredeterminadaId: string | null
}

// Las alertas que hablan de dinero que entra empiezan con "Recibiste" o
// mencionan un abono/consignación; todo lo demás arranca como gasto.
function adivinarTipo(texto: string): 'income' | 'expense' {
  return /recibiste|abono|consignaci/i.test(texto) ? 'income' : 'expense'
}

/**
 * Bandeja de correos de Bancolombia que ninguna plantilla reconoció. Antes
 * quedaban 'ignored' sin que nadie los viera — y cada uno puede ser plata que
 * la app no registró. Desde aquí se registran a mano o se descartan.
 */
export function UnrecognizedEmailsCard({ cuentas, cuentaPredeterminadaId }: UnrecognizedEmailsCardProps) {
  const { data: correos } = useCorreosSinReconocer()
  const { data: categorias } = useCategorias()
  const descartar = useDescartarCorreo()
  const crear = useCrearMovimiento()
  const [registrando, setRegistrando] = useState<FuenteMovimiento | null>(null)

  if (!correos || correos.length === 0) return null

  const textoRegistrando = registrando?.metadata?.texto_normalizado ?? ''

  function onSubmit(values: MovementFormValues) {
    if (!registrando) return
    crear.mutate(
      {
        cuenta_id: values.cuenta_id,
        tipo: values.tipo,
        categoria_id: values.categoria_id || undefined,
        monto: values.monto,
        descripcion: values.descripcion || undefined,
        comercio: values.comercio || undefined,
        fecha_movimiento: localDateInputToUtcIso(values.fecha_movimiento),
        estado: values.estado,
        ...(values.tipo === 'adjustment' ? { signo: values.signo === '-1' ? (-1 as const) : (1 as const) } : {}),
        fuente_movimiento_id: registrando.id,
      },
      {
        onSuccess: () => {
          notifySuccess('¡Listo! Movimiento registrado desde el correo ✅')
          setRegistrando(null)
        },
        onError: (err) => notifyError(err),
      }
    )
  }

  return (
    <Card>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/25 to-coral-500/20">
          <MailQuestion className="size-6 text-amber-300" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg text-ink-100">Correos sin reconocer</h3>
            <Badge tone="amber">{correos.length}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-400">
            Llegaron de Bancolombia pero no supimos leerlos. Si alguno es un movimiento, regístralo
            para que tu saldo cuadre; si no, descártalo.
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {correos.map((correo) => (
          <li key={correo.id} className="rounded-xl border border-white/10 px-4 py-3">
            <p className="text-xs text-ink-500">{formatDateTime(correo.fecha_recibido)}</p>
            <p className="mt-1 line-clamp-3 text-sm text-ink-200">
              {correo.metadata?.texto_normalizado || correo.asunto || '(correo sin texto)'}
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                loading={descartar.isPending && descartar.variables === correo.id}
                onClick={() =>
                  descartar.mutate(correo.id, { onError: (err) => notifyError(err) })
                }
              >
                <X className="size-4" />
                No es un movimiento
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setRegistrando(correo)}>
                <Plus className="size-4" />
                Registrar
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        open={!!registrando}
        onClose={() => setRegistrando(null)}
        title="Registrar desde correo"
        maxWidth="max-w-xl"
      >
        {registrando && (
          <>
            <p className="mb-4 rounded-xl bg-white/5 px-4 py-3 text-sm text-ink-300">{textoRegistrando}</p>
            <MovementForm
              key={registrando.id}
              cuentas={cuentas}
              categorias={categorias ?? []}
              valoresIniciales={{
                tipo: adivinarTipo(textoRegistrando),
                cuenta_id: cuentaPredeterminadaId ?? '',
                fecha_movimiento: dateOnlyLocal(registrando.fecha_recibido),
              }}
              onSubmit={onSubmit}
              onCancel={() => setRegistrando(null)}
              submitting={crear.isPending}
            />
          </>
        )}
      </Modal>
    </Card>
  )
}

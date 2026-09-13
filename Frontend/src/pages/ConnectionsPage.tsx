import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { GmailConnectionCard } from '@/components/connections/GmailConnectionCard'
import {
  useActualizarConexion,
  useConexiones,
  useEliminarConexion,
  useIniciarConexionGoogle,
  useSincronizarConexion,
} from '@/hooks/useConexiones'
import { useCuentas } from '@/hooks/useCuentas'
import { notifyError, notifySuccess } from '@/utils/toast'
import toast from 'react-hot-toast'

const MOTIVOS_ERROR: Record<string, string> = {
  cancelado: 'Cancelaste la conexión con Google antes de terminar.',
  parametros_faltantes: 'Google no envió la información esperada. Intenta de nuevo.',
  state_invalido_o_expirado: 'La conexión tardó demasiado o expiró. Intenta de nuevo.',
  google_no_devolvio_tokens: 'Google no devolvió los permisos necesarios. Intenta de nuevo.',
  no_se_pudo_guardar: 'No pudimos guardar la conexión de nuestro lado. Intenta de nuevo.',
}

export function ConnectionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: conexiones, isLoading } = useConexiones()
  const { data: cuentas } = useCuentas()
  const iniciarGoogle = useIniciarConexionGoogle()
  const eliminar = useEliminarConexion()
  const actualizarConexion = useActualizarConexion()
  const sincronizar = useSincronizarConexion()
  const [desconectando, setDesconectando] = useState<string | null>(null)
  const parametrosYaLeidos = useRef(false)

  useEffect(() => {
    const estado = searchParams.get('estado')
    if (!estado || parametrosYaLeidos.current) return
    parametrosYaLeidos.current = true

    if (estado === 'exito') {
      notifySuccess('¡Gmail conectado! 📬 Pronto podremos leer tus correos bancarios automáticamente')
    } else if (estado === 'error') {
      const motivo = searchParams.get('motivo') ?? ''
      const mensaje = MOTIVOS_ERROR[motivo] ?? 'No se pudo completar la conexión con Google. Intenta de nuevo.'
      toast.error(mensaje)
    }

    // Limpiamos los query params para que un refresh no vuelva a disparar el mensaje.
    setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const conexionGoogle = conexiones?.find((c) => c.proveedor === 'google')

  function conectarGoogle() {
    iniciarGoogle.mutate(undefined, {
      onSuccess: (data) => {
        window.location.href = data.url
      },
      onError: (err) => notifyError(err),
    })
  }

  function confirmarDesconectar() {
    if (!desconectando) return
    eliminar.mutate(desconectando, {
      onSuccess: () => {
        notifySuccess('Gmail desconectado.')
        setDesconectando(null)
      },
      onError: (err) => notifyError(err),
    })
  }

  function cambiarCuentaPredeterminada(cuentaId: string | null) {
    if (!conexionGoogle) return
    actualizarConexion.mutate(
      { id: conexionGoogle.id, cuentaPredeterminadaId: cuentaId },
      {
        onSuccess: () => notifySuccess('Cuenta actualizada.'),
        onError: (err) => notifyError(err),
      }
    )
  }

  function sincronizarAhora() {
    if (!conexionGoogle) return
    sincronizar.mutate(conexionGoogle.id, {
      onSuccess: (resumen) => {
        if (resumen.movimientos_creados > 0) {
          notifySuccess(
            `¡Listo! 📬 ${resumen.movimientos_creados} movimiento${resumen.movimientos_creados === 1 ? '' : 's'} nuevo${resumen.movimientos_creados === 1 ? '' : 's'} esperando tu revisión.`
          )
        } else if (resumen.correos_nuevos === 0) {
          toast('No hay correos nuevos por ahora.')
        } else {
          toast(`Revisé ${resumen.correos_nuevos} correo${resumen.correos_nuevos === 1 ? '' : 's'} nuevo${resumen.correos_nuevos === 1 ? '' : 's'}, pero no reconocí ninguno todavía.`)
        }
      },
      onError: (err) => notifyError(err),
    })
  }

  return (
    <div>
      <PageHeader
        title="Conexiones"
        description="Conecta cuentas externas para que FinanzIA pueda ayudarte más adelante."
      />

      {isLoading ? (
        <Spinner />
      ) : (
        <div className="flex flex-col gap-4">
          <GmailConnectionCard
            conexion={conexionGoogle}
            cuentas={cuentas ?? []}
            onConnect={conectarGoogle}
            onDisconnect={() => setDesconectando(conexionGoogle?.id ?? null)}
            onCambiarCuentaPredeterminada={cambiarCuentaPredeterminada}
            onSincronizar={sincronizarAhora}
            connecting={iniciarGoogle.isPending}
            actualizandoCuenta={actualizarConexion.isPending}
            sincronizando={sincronizar.isPending}
          />

          <div className="flex items-start gap-2 rounded-xl border border-dashed border-white/10 px-4 py-3 text-xs text-ink-500">
            <Link2 className="mt-0.5 size-4 shrink-0" />
            <p>
              Sincronizar revisa tus correos de Bancolombia y crea movimientos pendientes de
              revisión automáticamente — nunca confirma nada por su cuenta. También corre solo cada
              30 minutos mientras el servidor esté encendido, pero puedes forzarlo con el botón
              cuando quieras verlo al día.
            </p>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!desconectando}
        onClose={() => setDesconectando(null)}
        onConfirm={confirmarDesconectar}
        title="Desconectar Gmail"
        description="Esto borrará la conexión y sus tokens guardados. Podrás volver a conectarla cuando quieras, pero tendrás que autorizar de nuevo desde Google."
        confirmLabel="Desconectar"
        loading={eliminar.isPending}
      />
    </div>
  )
}

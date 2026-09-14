import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { GmailConnectionCard } from '@/components/connections/GmailConnectionCard'
import {
  useActualizarConexion,
  useCompletarConexionGoogle,
  useConexiones,
  useEliminarConexion,
  useIniciarConexionGoogle,
  useSincronizarConexion,
} from '@/hooks/useConexiones'
import { useCuentas } from '@/hooks/useCuentas'
import { notifyError, notifySuccess } from '@/utils/toast'
import toast from 'react-hot-toast'

// Google nos redirige a esta misma página con ?code=...&state=... (o
// ?error=... si el usuario canceló). El `state` viaja por sessionStorage,
// nunca por el servidor -- así no depende de que dos peticiones caigan en la
// misma instancia del backend (crítico en un despliegue serverless).
const OAUTH_STATE_KEY = 'finanzia_google_oauth_state'

export function ConnectionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: conexiones, isLoading } = useConexiones()
  const { data: cuentas } = useCuentas()
  const iniciarGoogle = useIniciarConexionGoogle()
  const completarConexion = useCompletarConexionGoogle()
  const eliminar = useEliminarConexion()
  const actualizarConexion = useActualizarConexion()
  const sincronizar = useSincronizarConexion()
  const [desconectando, setDesconectando] = useState<string | null>(null)
  const parametrosYaLeidos = useRef(false)

  useEffect(() => {
    const code = searchParams.get('code')
    const errorParam = searchParams.get('error')
    const returnedState = searchParams.get('state')

    if (!code && !errorParam) return
    if (parametrosYaLeidos.current) return
    parametrosYaLeidos.current = true

    let estadoGuardado: string | null = null
    try {
      estadoGuardado = sessionStorage.getItem(OAUTH_STATE_KEY)
      sessionStorage.removeItem(OAUTH_STATE_KEY)
    } catch {
      // sessionStorage puede fallar en algunos navegadores/modos privados --
      // sin él no podemos verificar el state, así que tratamos como inválido.
    }

    if (errorParam) {
      toast.error('Cancelaste la conexión con Google antes de terminar.')
    } else if (!returnedState || returnedState !== estadoGuardado) {
      toast.error('No pudimos verificar la conexión (puede haber tardado demasiado). Intenta de nuevo.')
    } else if (code) {
      completarConexion.mutate(code, {
        onSuccess: () => notifySuccess('¡Gmail conectado! 📬 Pronto podremos leer tus correos bancarios automáticamente'),
        onError: (err) => notifyError(err),
      })
    }

    // Limpiamos los query params para que un refresh no vuelva a disparar el mensaje.
    setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const conexionGoogle = conexiones?.find((c) => c.proveedor === 'google')

  function conectarGoogle() {
    iniciarGoogle.mutate(undefined, {
      onSuccess: (data) => {
        try {
          sessionStorage.setItem(OAUTH_STATE_KEY, data.state)
        } catch {
          // si sessionStorage falla, seguimos igual -- la verificación al
          // volver simplemente no coincidirá y se pedirá reintentar.
        }
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

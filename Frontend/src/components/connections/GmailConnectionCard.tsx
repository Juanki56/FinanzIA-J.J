import { Mail, RefreshCw, ShieldCheck, Unplug } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDateTime } from '@/utils/date'
import type { Conexion, Cuenta } from '@/types'

interface GmailConnectionCardProps {
  conexion?: Conexion
  cuentas: Cuenta[]
  onConnect: () => void
  onDisconnect: () => void
  onCambiarCuentaPredeterminada: (cuentaId: string | null) => void
  onSincronizar: () => void
  connecting?: boolean
  actualizandoCuenta?: boolean
  sincronizando?: boolean
}

export function GmailConnectionCard({
  conexion,
  cuentas,
  onConnect,
  onDisconnect,
  onCambiarCuentaPredeterminada,
  onSincronizar,
  connecting,
  actualizandoCuenta,
  sincronizando,
}: GmailConnectionCardProps) {
  const conectado = !!conexion
  const tieneCuentaPredeterminada = !!conexion?.cuenta_predeterminada_id

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-coral-500/25 to-amber-500/20">
            <Mail className="size-6 text-coral-300" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-lg text-ink-100">Gmail</h3>
              {conectado && <Badge tone="mint">Conectado</Badge>}
              {conectado && conexion.estado && conexion.estado !== 'active' && (
                <Badge tone="amber">{conexion.estado}</Badge>
              )}
            </div>
            {conectado ? (
              <p className="mt-1 text-sm text-ink-400">
                Conectado desde {formatDateTime(conexion.created_at)}
                {conexion.ultima_sincronizacion_at && (
                  <> · Última sincronización: {formatDateTime(conexion.ultima_sincronizacion_at)}</>
                )}
              </p>
            ) : (
              <p className="mt-1 text-sm text-ink-400">
                Todavía no has conectado ninguna cuenta de Gmail.
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {conectado ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={onSincronizar}
                loading={sincronizando}
                disabled={!tieneCuentaPredeterminada}
              >
                <RefreshCw className="size-4" />
                Sincronizar ahora
              </Button>
              <Button variant="danger" size="sm" onClick={onDisconnect}>
                <Unplug className="size-4" />
                Desconectar
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={onConnect} loading={connecting}>
              <Mail className="size-4" />
              Conectar con Gmail
            </Button>
          )}
        </div>
      </div>

      {conectado && (
        <div className="mt-4 flex flex-col gap-1.5 rounded-xl bg-white/4 px-3.5 py-3">
          <label className="text-xs font-medium text-ink-300">
            Cuenta a la que se atribuyen los movimientos detectados
          </label>
          <select
            value={conexion.cuenta_predeterminada_id ?? ''}
            disabled={actualizandoCuenta}
            onChange={(e) => onCambiarCuentaPredeterminada(e.target.value || null)}
            className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-ink-100 outline-none focus:border-violet-400"
          >
            <option value="">Elige una cuenta…</option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          {!tieneCuentaPredeterminada && (
            <p className="text-xs text-amber-300">
              Elige una cuenta antes de poder sincronizar — ahí se registrarán los movimientos detectados.
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-cyan-500/8 px-3.5 py-2.5 text-xs text-cyan-200 ring-1 ring-cyan-500/20">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        <p>
          Esto solo nos da permiso de <strong>leer</strong> tus correos, nunca de enviarlos ni
          modificarlos. Sincronizar revisa tus correos de Bancolombia y crea movimientos
          <strong> pendientes de revisión</strong> — nunca confirma nada por su cuenta.
        </p>
      </div>
    </Card>
  )
}

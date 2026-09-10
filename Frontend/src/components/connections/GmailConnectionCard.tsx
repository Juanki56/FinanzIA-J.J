import { Mail, ShieldCheck, Unplug } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDateTime } from '@/utils/date'
import type { Conexion } from '@/types'

interface GmailConnectionCardProps {
  conexion?: Conexion
  onConnect: () => void
  onDisconnect: () => void
  connecting?: boolean
}

export function GmailConnectionCard({ conexion, onConnect, onDisconnect, connecting }: GmailConnectionCardProps) {
  const conectado = !!conexion

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

        <div className="shrink-0">
          {conectado ? (
            <Button variant="danger" size="sm" onClick={onDisconnect}>
              <Unplug className="size-4" />
              Desconectar
            </Button>
          ) : (
            <Button size="sm" onClick={onConnect} loading={connecting}>
              <Mail className="size-4" />
              Conectar con Gmail
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-cyan-500/8 px-3.5 py-2.5 text-xs text-cyan-200 ring-1 ring-cyan-500/20">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        <p>
          Esto solo nos da permiso de <strong>leer</strong> tus correos, nunca de enviarlos ni
          modificarlos. Por ahora solo guardamos la conexión: todavía no leemos ni analizamos
          ningún correo automáticamente — eso llega en una fase futura.
        </p>
      </div>
    </Card>
  )
}

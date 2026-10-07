import { TriangleAlert } from 'lucide-react'
import type { AdvertenciaSimulacion } from '@/types'

const TEXTO_ADVERTENCIA: Record<AdvertenciaSimulacion, string> = {
  sin_fondos: 'Las cuentas elegidas no tienen saldo.',
  ritmo_sin_datos: 'No hay suficientes meses confirmados para saber cuánto ahorras al mes. Dímelo (ej. "ahorro 500 mil al mes") para estimar plazos.',
  ritmo_no_positivo: 'Con un ahorro mensual de cero o negativo no avanzarías.',
  gasto_supera_saldo: 'Este gasto es mayor que todo el saldo de esas cuentas.',
  toca_objetivos: 'Este gasto usaría dinero que tienes reservado para tus objetivos.',
  objetivo_vencido: 'Tienes un objetivo cuya fecha ya pasó sin completarse.',
  sin_objetivos: 'No tienes objetivos de ahorro activos. Puedes crearlos en Objetivos.',
  hay_pendientes: 'Tienes movimientos pendientes que no cuentan en estas cifras. Confírmalos en Revisar para que estén completas.',
}

/** Advertencias y supuestos de un resultado del simulador, iguales para todos los cálculos. */
export function ResultNotes({ advertencias, supuestos }: { advertencias: AdvertenciaSimulacion[]; supuestos: string[] }) {
  return (
    <>
      {advertencias.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {advertencias.map((a) => (
            <li key={a} className="flex gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              {TEXTO_ADVERTENCIA[a]}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-ink-500">
        Es solo un cálculo: no se registró ningún gasto ni cambió ningún saldo. {supuestos.join(' ')}
      </p>
    </>
  )
}

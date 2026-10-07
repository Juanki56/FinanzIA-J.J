import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/apiClient'
import type { RespuestaPregunta, RespuestaSimulacion, SimulacionGasto } from '@/types'

// Todo lo del asistente es simulación: no crea movimientos ni cambia saldos,
// por eso estas mutations no invalidan ninguna consulta.

export interface SimularGastoInput {
  monto: number
  plazo_meses?: number
  /** Si se manda, reemplaza el ahorro mensual que calcula FinanzIA. */
  ahorro_mensual?: number
  /** Cuentas de donde sale el gasto. Vacío = tus cuentas de ahorro (o todo, si no tienes). */
  cuenta_ids?: string[]
}

/** "¿Qué pasa si gasto X?" desde el formulario. */
export function useSimularGasto() {
  return useMutation({
    mutationFn: (input: SimularGastoInput) =>
      api.post<RespuestaSimulacion<SimulacionGasto>>('/asistente/simulaciones/gasto', input),
  })
}

export interface PreguntaInput {
  pregunta: string
  /** Últimas preguntas y respuestas, para entender preguntas de seguimiento. */
  historial: { pregunta: string; respuesta: string }[]
}

/** Pregunta libre: FinanzIA elige el cálculo, lo hace y la IA lo explica. */
export function usePreguntarAsistente() {
  return useMutation({
    mutationFn: (input: PreguntaInput) => api.post<RespuestaPregunta>('/asistente/preguntas', input),
  })
}

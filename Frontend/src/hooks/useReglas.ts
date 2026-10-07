import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/apiClient'

export interface NuevaReglaInput {
  nombre: string
  categoria_id: string
  valor: string
  campo_objetivo: 'comercio' | 'descripcion' | 'remitente' | 'asunto'
  operador: 'equals' | 'contains' | 'starts_with' | 'ends_with'
  prioridad?: number
}

/** Regla de categorización: los correos que coincidan llegan ya con esa categoría. */
export function useCrearRegla() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NuevaReglaInput) => api.post<{ regla: { id: string } }>('/reglas-categorizacion', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reglas'] }),
  })
}

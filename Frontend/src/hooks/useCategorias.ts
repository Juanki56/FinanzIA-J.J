import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/apiClient'
import type { Categoria } from '@/types'

export function useCategorias(opts?: { incluirInactivas?: boolean }) {
  const incluirInactivas = opts?.incluirInactivas ?? false
  return useQuery({
    queryKey: ['categorias', { incluirInactivas }],
    queryFn: () =>
      api
        .get<{ categorias: Categoria[] }>(
          incluirInactivas ? '/categorias?incluir_inactivas=true' : '/categorias'
        )
        .then((r) => r.categorias),
  })
}

export type NuevaCategoriaInput = {
  nombre: string
  tipo: Categoria['tipo']
  categoria_padre_id?: string
  icono?: string
  color?: string
}

export function useCrearCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NuevaCategoriaInput) => api.post<{ categoria: Categoria }>('/categorias', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
  })
}

export type EditarCategoriaInput = Partial<NuevaCategoriaInput> & { activa?: boolean }

export function useActualizarCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, cambios }: { id: string; cambios: EditarCategoriaInput }) =>
      api.patch<{ categoria: Categoria }>(`/categorias/${id}`, cambios),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
  })
}

export function useEliminarCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/categorias/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
  })
}

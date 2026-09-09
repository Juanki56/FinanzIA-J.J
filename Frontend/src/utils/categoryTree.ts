import type { Categoria, TipoCategoria } from '@/types'

export interface CategoriaOption {
  id: string
  label: string
  esPadre: boolean
}

/** Aplana la jerarquía padre/hijo en una lista ordenada apta para un <select>. */
export function buildCategoryOptions(
  categorias: Categoria[] | undefined,
  tipo?: 'income' | 'expense'
): CategoriaOption[] {
  if (!categorias) return []

  const filtradas = tipo
    ? categorias.filter((c) => c.tipo === tipo || c.tipo === 'both')
    : categorias

  const porId = new Map(filtradas.map((c) => [c.id, c]))
  const raices = filtradas
    .filter((c) => !c.categoria_padre_id || !porId.has(c.categoria_padre_id))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  const opciones: CategoriaOption[] = []
  for (const raiz of raices) {
    opciones.push({ id: raiz.id, label: raiz.nombre, esPadre: true })
    const hijos = filtradas
      .filter((c) => c.categoria_padre_id === raiz.id)
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
    for (const hijo of hijos) {
      opciones.push({ id: hijo.id, label: `↳ ${hijo.nombre}`, esPadre: false })
    }
  }
  return opciones
}

export interface CategoriaTreeNode {
  categoria: Categoria
  hijos: Categoria[]
}

export function buildCategoryTree(categorias: Categoria[] | undefined): CategoriaTreeNode[] {
  if (!categorias) return []
  const porId = new Map(categorias.map((c) => [c.id, c]))
  const raices = categorias
    .filter((c) => !c.categoria_padre_id || !porId.has(c.categoria_padre_id))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  return raices.map((raiz) => ({
    categoria: raiz,
    hijos: categorias
      .filter((c) => c.categoria_padre_id === raiz.id)
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
  }))
}

export function tipoCategoriaLabel(tipo: TipoCategoria): string {
  return tipo === 'income' ? 'Ingreso' : tipo === 'expense' ? 'Gasto' : 'Ambos'
}

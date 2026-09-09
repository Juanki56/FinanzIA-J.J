import { motion } from 'framer-motion'
import { CirclePlus, Pencil, Power, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { CATEGORIA_TIPO_META } from '@/utils/meta'
import type { CategoriaTreeNode } from '@/utils/categoryTree'
import type { Categoria } from '@/types'

interface CategoryTreeViewProps {
  nodos: CategoriaTreeNode[]
  onEdit: (categoria: Categoria) => void
  onAddChild: (padre: Categoria) => void
  onToggleActiva: (categoria: Categoria) => void
  onDelete: (categoria: Categoria) => void
}

function CategoryRow({
  categoria,
  esHijo,
  onEdit,
  onAddChild,
  onToggleActiva,
  onDelete,
}: {
  categoria: Categoria
  esHijo?: boolean
  onEdit: () => void
  onAddChild?: () => void
  onToggleActiva: () => void
  onDelete: () => void
}) {
  const meta = CATEGORIA_TIPO_META[categoria.tipo]
  return (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.03] ${esHijo ? 'ml-8' : ''} ${!categoria.activa ? 'opacity-45' : ''}`}>
      <div
        className="flex size-9 items-center justify-center rounded-lg text-base"
        style={{ backgroundColor: categoria.color ? `${categoria.color}26` : 'rgba(255,255,255,0.06)' }}
      >
        {categoria.icono ?? '🏷️'}
      </div>
      <span className="flex-1 text-sm font-medium text-ink-100">{categoria.nombre}</span>
      <Badge tone={meta.tone}>{meta.label}</Badge>
      {!categoria.activa && <Badge tone="neutral">Inactiva</Badge>}
      <div className="flex gap-1">
        {onAddChild && (
          <button onClick={onAddChild} className="rounded-lg p-2 text-ink-400 hover:bg-white/8 hover:text-ink-100" aria-label="Agregar subcategoría">
            <CirclePlus className="size-4" />
          </button>
        )}
        <button onClick={onEdit} className="rounded-lg p-2 text-ink-400 hover:bg-white/8 hover:text-ink-100" aria-label="Editar">
          <Pencil className="size-4" />
        </button>
        <button
          onClick={onToggleActiva}
          className="rounded-lg p-2 text-ink-400 hover:bg-amber-500/15 hover:text-amber-400"
          aria-label={categoria.activa ? 'Desactivar' : 'Reactivar'}
        >
          <Power className="size-4" />
        </button>
        <button onClick={onDelete} className="rounded-lg p-2 text-ink-400 hover:bg-coral-500/15 hover:text-coral-400" aria-label="Eliminar">
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  )
}

export function CategoryTreeView({ nodos, onEdit, onAddChild, onToggleActiva, onDelete }: CategoryTreeViewProps) {
  return (
    <motion.div layout className="divide-y divide-white/5">
      {nodos.map(({ categoria, hijos }) => (
        <div key={categoria.id} className="py-1">
          <CategoryRow
            categoria={categoria}
            onEdit={() => onEdit(categoria)}
            onAddChild={() => onAddChild(categoria)}
            onToggleActiva={() => onToggleActiva(categoria)}
            onDelete={() => onDelete(categoria)}
          />
          {hijos.map((hijo) => (
            <CategoryRow
              key={hijo.id}
              categoria={hijo}
              esHijo
              onEdit={() => onEdit(hijo)}
              onToggleActiva={() => onToggleActiva(hijo)}
              onDelete={() => onDelete(hijo)}
            />
          ))}
        </div>
      ))}
    </motion.div>
  )
}

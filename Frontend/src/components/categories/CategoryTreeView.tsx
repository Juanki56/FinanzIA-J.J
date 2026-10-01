import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ChevronRight, CirclePlus, Pencil, Power, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { CATEGORIA_TIPO_META } from '@/utils/meta'
import { formatCurrency } from '@/utils/currency'
import type { CategoriaTreeNode } from '@/utils/categoryTree'
import type { ResumenCategoria } from '@/utils/flujos'
import type { Categoria } from '@/types'

interface CategoryTreeViewProps {
  nodos: CategoriaTreeNode[]
  onEdit: (categoria: Categoria) => void
  onAddChild: (padre: Categoria) => void
  onToggleActiva: (categoria: Categoria) => void
  onDelete: (categoria: Categoria) => void
  /** Totales del periodo por categoría (el padre ya incluye a sus hijas). */
  resumen?: Map<string, ResumenCategoria>
  moneda?: string
  /** Enlace al detalle de una categoría; conserva el periodo elegido. */
  hrefDetalle?: (categoria: Categoria) => string
}

/** Monto a mostrar según el tipo: gastado, recibido, o ambos si es mixta. */
export function MontoCategoria({
  categoria,
  resumen,
  moneda = 'COP',
}: {
  categoria: Pick<Categoria, 'tipo'>
  resumen?: ResumenCategoria
  moneda?: string
}) {
  if (!resumen || resumen.cantidad === 0) {
    return <span className="text-xs text-ink-500">Sin movimientos</span>
  }
  const mostrarGastos = categoria.tipo !== 'income' && (resumen.gastos > 0 || categoria.tipo === 'expense')
  const mostrarIngresos = categoria.tipo !== 'expense' && (resumen.ingresos > 0 || categoria.tipo === 'income')
  return (
    <span className="flex flex-col items-end leading-tight">
      {mostrarGastos && (
        <span className="font-tabular text-sm font-semibold text-ink-100">
          {categoria.tipo === 'both' && <span className="mr-1 text-xs font-normal text-ink-500">Gastos</span>}
          {formatCurrency(resumen.gastos, moneda)}
        </span>
      )}
      {mostrarIngresos && (
        <span className="font-tabular text-sm font-semibold text-ink-100">
          {categoria.tipo === 'both' && <span className="mr-1 text-xs font-normal text-ink-500">Ingresos</span>}
          {formatCurrency(resumen.ingresos, moneda)}
        </span>
      )}
      <span className="text-xs text-ink-500">
        {resumen.cantidad} {resumen.cantidad === 1 ? 'movimiento' : 'movimientos'}
      </span>
    </span>
  )
}

function CategoryRow({
  categoria,
  esHijo,
  onEdit,
  onAddChild,
  onToggleActiva,
  onDelete,
  resumen,
  moneda,
  href,
}: {
  categoria: Categoria
  esHijo?: boolean
  onEdit: () => void
  onAddChild?: () => void
  onToggleActiva: () => void
  onDelete: () => void
  resumen?: ResumenCategoria
  moneda?: string
  href?: string
}) {
  const meta = CATEGORIA_TIPO_META[categoria.tipo]
  const contenido = (
    <>
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-base"
        style={{ backgroundColor: categoria.color ? `${categoria.color}26` : 'rgba(255,255,255,0.06)' }}
      >
        {categoria.icono ?? '🏷️'}
      </div>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-100">{categoria.nombre}</span>
      <span className="hidden sm:inline-flex">
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </span>
      {!categoria.activa && <Badge tone="neutral">Inactiva</Badge>}
      {href && (
        <>
          <MontoCategoria categoria={categoria} resumen={resumen} moneda={moneda} />
          <ChevronRight className="size-4 shrink-0 text-ink-500 transition-colors group-hover:text-ink-200" aria-hidden />
        </>
      )}
    </>
  )

  return (
    <div className={`flex items-center gap-2 rounded-xl hover:bg-white/[0.03] ${esHijo ? 'ml-8' : ''} ${!categoria.activa ? 'opacity-45' : ''}`}>
      {href ? (
        <Link
          to={href}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5"
          title={`Ver detalle de ${categoria.nombre}`}
        >
          {contenido}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5">{contenido}</div>
      )}
      <div className="flex shrink-0 gap-1 pr-2">
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

export function CategoryTreeView({
  nodos,
  onEdit,
  onAddChild,
  onToggleActiva,
  onDelete,
  resumen,
  moneda,
  hrefDetalle,
}: CategoryTreeViewProps) {
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
            resumen={resumen?.get(categoria.id)}
            moneda={moneda}
            href={hrefDetalle?.(categoria)}
          />
          {hijos.map((hijo) => (
            <CategoryRow
              key={hijo.id}
              categoria={hijo}
              esHijo
              onEdit={() => onEdit(hijo)}
              onToggleActiva={() => onToggleActiva(hijo)}
              onDelete={() => onDelete(hijo)}
              resumen={resumen?.get(hijo.id)}
              moneda={moneda}
              href={hrefDetalle?.(hijo)}
            />
          ))}
        </div>
      ))}
    </motion.div>
  )
}

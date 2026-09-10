import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Paginacion } from '@/types'

interface PaginationProps {
  paginacion: Paginacion
  onChange: (pagina: number) => void
}

export function Pagination({ paginacion, onChange }: PaginationProps) {
  const { pagina, total_paginas, total } = paginacion
  if (total_paginas <= 1) return null

  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm text-ink-400">
      <span>
        Página {pagina} de {total_paginas} · {total} en total
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(pagina - 1)}
          disabled={pagina <= 1}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 hover:bg-white/8 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="size-4" />
          Anterior
        </button>
        <button
          onClick={() => onChange(pagina + 1)}
          disabled={pagina >= total_paginas}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 hover:bg-white/8 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Siguiente
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

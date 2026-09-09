import { Input, Select } from '@/components/ui/Field'
import type { Categoria, Cuenta } from '@/types'

export interface MovementFiltersState {
  cuentaId: string
  categoriaId: string
  tipo: string
  desde: string
  hasta: string
}

interface MovementFiltersProps {
  value: MovementFiltersState
  onChange: (value: MovementFiltersState) => void
  cuentas: Cuenta[]
  categorias: Categoria[]
}

export function MovementFilters({ value, onChange, cuentas, categorias }: MovementFiltersProps) {
  function set<K extends keyof MovementFiltersState>(key: K, v: MovementFiltersState[K]) {
    onChange({ ...value, [key]: v })
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <Select value={value.cuentaId} onChange={(e) => set('cuentaId', e.target.value)}>
        <option value="">Todas las cuentas</option>
        {cuentas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </Select>

      <Select value={value.categoriaId} onChange={(e) => set('categoriaId', e.target.value)}>
        <option value="">Todas las categorías</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </Select>

      <Select value={value.tipo} onChange={(e) => set('tipo', e.target.value)}>
        <option value="">Todos los tipos</option>
        <option value="income">Ingresos</option>
        <option value="expense">Gastos</option>
        <option value="adjustment">Ajustes</option>
        <option value="transfer">Transferencias</option>
      </Select>

      <Input type="date" value={value.desde} onChange={(e) => set('desde', e.target.value)} placeholder="Desde" />
      <Input type="date" value={value.hasta} onChange={(e) => set('hasta', e.target.value)} placeholder="Hasta" />
    </div>
  )
}

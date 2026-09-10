// Tipos que reflejan uno a uno los recursos expuestos por el backend de FinanzIA.
// No inventar campos que el backend no devuelve.

export type TipoCuenta =
  | 'cash'
  | 'bank'
  | 'ewallet'
  | 'savings'
  | 'credit_card'
  | 'investment'
  | 'loan'
  | 'other'

export interface Usuario {
  id: string
  nombre: string
  email: string
  moneda_principal: string
  zona_horaria: string
}

export interface Cuenta {
  id: string
  usuario_id?: string
  nombre: string
  tipo: TipoCuenta
  institucion: string | null
  moneda: string
  saldo_inicial: number
  saldo_actual: number
  es_pasivo: boolean
  incluir_en_saldo_total?: boolean
  activa: boolean
  limite_credito: number | null
  dia_corte: number | null
  dia_pago: number | null
  notas?: string | null
}

export type TipoMovimiento = 'income' | 'expense' | 'adjustment' | 'transfer'
export type EstadoMovimiento = 'pending' | 'confirmed' | 'cancelled'

export interface Movimiento {
  id: string
  usuario_id: string
  cuenta_id: string
  categoria_id: string | null
  tipo: TipoMovimiento
  monto: number
  signo: 1 | -1 | null
  descripcion: string | null
  comercio: string | null
  fecha_movimiento: string
  estado: EstadoMovimiento
  eliminado: boolean
  deleted_at: string | null
  transferencia_id?: string | null
  created_at?: string
}

export type EstadoTransferencia = 'pending' | 'completed' | 'cancelled'

export interface Transferencia {
  id: string
  usuario_id?: string
  cuenta_origen_id: string
  cuenta_destino_id: string
  monto: number
  descripcion: string | null
  fecha_transferencia: string
  estado: EstadoTransferencia
  created_at?: string
}

export type TipoCategoria = 'income' | 'expense' | 'both'

export interface Categoria {
  id: string
  usuario_id?: string
  categoria_padre_id: string | null
  nombre: string
  tipo: TipoCategoria
  icono: string | null
  color: string | null
  activa: boolean
}

export type PeriodoPresupuesto = 'weekly' | 'monthly' | 'yearly' | 'custom'

export interface Presupuesto {
  id: string
  usuario_id?: string
  categoria_id: string | null
  nombre: string
  monto_limite: number
  periodo: PeriodoPresupuesto
  fecha_inicio: string
  fecha_fin: string | null
  permitir_exceder: boolean
  activo: boolean
  // Calculados por el backend, solo lectura:
  gastado: number
  disponible: number
}

export type EstadoObjetivo = 'active' | 'completed' | 'paused' | 'cancelled'

export interface ObjetivoAhorro {
  id: string
  usuario_id?: string
  nombre: string
  descripcion: string | null
  monto_objetivo: number
  fecha_objetivo: string | null
  prioridad: number
  estado: EstadoObjetivo
  activo: boolean
  // Calculados por el backend, solo lectura:
  monto_asignado: number
  faltante: number
}

export interface AsignacionObjetivo {
  id: string
  usuario_id?: string
  objetivo_id: string
  cuenta_id: string
  monto_asignado: number
  notas: string | null
}

export type FrecuenciaRecurrente = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'

export interface TransaccionRecurrente {
  id: string
  usuario_id?: string
  cuenta_id: string
  categoria_id: string | null
  nombre: string
  descripcion: string | null
  tipo: 'income' | 'expense'
  monto_estimado: number
  frecuencia: FrecuenciaRecurrente
  intervalo: number | null
  dia_del_mes: number | null
  dia_de_la_semana: number | null
  fecha_inicio: string
  fecha_fin: string | null
  proxima_fecha: string
  tolerancia_monto: number | null
  activa: boolean
}

export interface ApiErrorBody {
  error: string
  detalle?: string
}

export interface Paginacion {
  pagina: number
  limite: number
  total: number
  total_paginas: number
}

export interface MovimientosPage {
  movimientos: Movimiento[]
  paginacion: Paginacion
}

export interface Conexion {
  id: string
  proveedor: string
  tipo: string
  identificador_externo: string | null
  estado: string
  scopes: string[]
  token_expira_at: string | null
  ultima_sincronizacion_at: string | null
  created_at: string
}

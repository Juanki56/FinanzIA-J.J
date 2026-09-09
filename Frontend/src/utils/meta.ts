import {
  Wallet, Landmark, Smartphone, PiggyBank, CreditCard, TrendingUp, HandCoins, CircleDollarSign,
} from 'lucide-react'
import type { TipoCuenta } from '@/types'

export const CUENTA_TIPO_META: Record<TipoCuenta, { label: string; icon: typeof Wallet; gradient: string }> = {
  cash: { label: 'Efectivo', icon: Wallet, gradient: 'from-mint-500 to-cyan-500' },
  bank: { label: 'Cuenta bancaria', icon: Landmark, gradient: 'from-violet-500 to-cyan-500' },
  ewallet: { label: 'Billetera digital', icon: Smartphone, gradient: 'from-magenta-500 to-violet-500' },
  savings: { label: 'Ahorros', icon: PiggyBank, gradient: 'from-mint-400 to-mint-500' },
  credit_card: { label: 'Tarjeta de crédito', icon: CreditCard, gradient: 'from-coral-500 to-magenta-500' },
  investment: { label: 'Inversión', icon: TrendingUp, gradient: 'from-amber-500 to-coral-400' },
  loan: { label: 'Préstamo', icon: HandCoins, gradient: 'from-coral-400 to-amber-500' },
  other: { label: 'Otra', icon: CircleDollarSign, gradient: 'from-ink-400 to-ink-500' },
}

export const MOVIMIENTO_TIPO_META = {
  income: { label: 'Ingreso', color: 'text-mint-400', sign: '+' },
  expense: { label: 'Gasto', color: 'text-coral-400', sign: '-' },
  adjustment: { label: 'Ajuste', color: 'text-amber-400', sign: '±' },
  transfer: { label: 'Transferencia', color: 'text-cyan-400', sign: '↔' },
} as const

export const MOVIMIENTO_ESTADO_META = {
  pending: { label: 'Pendiente', tone: 'amber' as const },
  confirmed: { label: 'Confirmado', tone: 'mint' as const },
  cancelled: { label: 'Cancelado', tone: 'coral' as const },
}

export const TRANSFERENCIA_ESTADO_META = {
  pending: { label: 'Pendiente', tone: 'amber' as const },
  completed: { label: 'Completada', tone: 'mint' as const },
  cancelled: { label: 'Cancelada', tone: 'coral' as const },
}

export const PERIODO_META = {
  weekly: 'Semanal',
  monthly: 'Mensual',
  yearly: 'Anual',
  custom: 'Personalizado',
}

export const OBJETIVO_ESTADO_META = {
  active: { label: 'Activo', tone: 'cyan' as const },
  completed: { label: '¡Completado! 🎉', tone: 'mint' as const },
  paused: { label: 'En pausa', tone: 'amber' as const },
  cancelled: { label: 'Cancelado', tone: 'coral' as const },
}

export const FRECUENCIA_META = {
  daily: 'Diaria',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  yearly: 'Anual',
}

export const CATEGORIA_TIPO_META = {
  income: { label: 'Ingreso', tone: 'mint' as const },
  expense: { label: 'Gasto', tone: 'coral' as const },
  both: { label: 'Ambos', tone: 'violet' as const },
}

export const EMOJI_SUGERIDOS = [
  '💰', '💵', '💳', '🧾', '🛒', '🍔', '🍕', '🚗', '🚌', '🏠', '💡', '🎮',
  '🎬', '👕', '💊', '📚', '✈️', '🎁', '📱', '☕', '🐶', '💼', '📈', '🏦',
]

export const CATEGORIAS_SUGERIDAS: { nombre: string; tipo: 'income' | 'expense'; icono: string }[] = [
  { nombre: 'Salario', tipo: 'income', icono: '💰' },
  { nombre: 'Otros ingresos', tipo: 'income', icono: '💵' },
  { nombre: 'Mercado', tipo: 'expense', icono: '🛒' },
  { nombre: 'Comida', tipo: 'expense', icono: '🍔' },
  { nombre: 'Transporte', tipo: 'expense', icono: '🚗' },
  { nombre: 'Vivienda', tipo: 'expense', icono: '🏠' },
  { nombre: 'Servicios', tipo: 'expense', icono: '💡' },
  { nombre: 'Entretenimiento', tipo: 'expense', icono: '🎮' },
  { nombre: 'Compras', tipo: 'expense', icono: '🛍️' },
  { nombre: 'Salud', tipo: 'expense', icono: '💊' },
  { nombre: 'Educación', tipo: 'expense', icono: '📚' },
  { nombre: 'Otros gastos', tipo: 'expense', icono: '🧾' },
]

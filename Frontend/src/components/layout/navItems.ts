import {
  LayoutDashboard, Wallet, Receipt, ListChecks, FlaskConical, ArrowLeftRight, Tags, Target, Trophy, Repeat, Link2,
} from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/cuentas', label: 'Cuentas', icon: Wallet },
  { to: '/movimientos', label: 'Movimientos', icon: Receipt },
  { to: '/revisar', label: 'Revisar', icon: ListChecks },
  { to: '/asistente', label: 'Simulador', icon: FlaskConical },
  { to: '/transferencias', label: 'Transferencias', icon: ArrowLeftRight },
  { to: '/categorias', label: 'Categorías', icon: Tags },
  { to: '/presupuestos', label: 'Presupuestos', icon: Target },
  { to: '/objetivos', label: 'Objetivos', icon: Trophy },
  { to: '/recurrentes', label: 'Recurrentes', icon: Repeat },
  { to: '/conexiones', label: 'Conexiones', icon: Link2 },
]

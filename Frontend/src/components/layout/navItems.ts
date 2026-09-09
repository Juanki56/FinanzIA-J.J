import {
  LayoutDashboard, Wallet, Receipt, ArrowLeftRight, Tags, Target, Trophy, Repeat,
} from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/cuentas', label: 'Cuentas', icon: Wallet },
  { to: '/movimientos', label: 'Movimientos', icon: Receipt },
  { to: '/transferencias', label: 'Transferencias', icon: ArrowLeftRight },
  { to: '/categorias', label: 'Categorías', icon: Tags },
  { to: '/presupuestos', label: 'Presupuestos', icon: Target },
  { to: '/objetivos', label: 'Objetivos', icon: Trophy },
  { to: '/recurrentes', label: 'Recurrentes', icon: Repeat },
]

import { Link } from 'react-router-dom'
import { Target, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { CategorySpendChart } from '@/components/dashboard/CategorySpendChart'
import { BudgetCard } from '@/components/budgets/BudgetCard'
import { CUENTA_TIPO_META } from '@/utils/meta'
import { formatCurrency } from '@/utils/currency'
import { useCuentas } from '@/hooks/useCuentas'
import { useTodosLosMovimientos } from '@/hooks/useMovimientos'
import { useCategorias } from '@/hooks/useCategorias'
import { usePresupuestos } from '@/hooks/usePresupuestos'
import { useMe } from '@/hooks/useMe'

export function DashboardPage() {
  const { data: usuario } = useMe()
  const { data: cuentas, isLoading: cargandoCuentas } = useCuentas()
  const { data: movimientos, isLoading: cargandoMovs } = useTodosLosMovimientos()
  const { data: categorias, isLoading: cargandoCats } = useCategorias()
  const { data: presupuestos, isLoading: cargandoPres } = usePresupuestos()

  const moneda = usuario?.moneda_principal ?? 'COP'
  const cuentasActivas = (cuentas ?? []).filter((c) => c.activa)

  const disponible = cuentasActivas
    .filter((c) => !c.es_pasivo && c.incluir_en_saldo_total !== false)
    .reduce((sum, c) => sum + Number(c.saldo_actual), 0)

  const deudas = cuentasActivas
    .filter((c) => c.es_pasivo && c.incluir_en_saldo_total !== false)
    .reduce((sum, c) => sum + Number(c.saldo_actual), 0)

  const cargando = cargandoCuentas || cargandoMovs || cargandoCats || cargandoPres

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`¡Hola, ${usuario?.nombre?.split(' ')[0] ?? 'jugador'}! 👋`}
        description="Este es el resumen de tu partida financiera."
      />

      {cargando ? (
        <Spinner />
      ) : (
        <>
          <SummaryCards disponible={disponible} deudas={deudas} moneda={moneda} />

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Gastos por categoría (este mes)</CardTitle>
              </CardHeader>
              <CategorySpendChart movimientos={movimientos ?? []} categorias={categorias ?? []} moneda={moneda} />
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Tus cuentas</CardTitle>
                <Link to="/cuentas" className="text-xs font-semibold text-violet-300 hover:text-violet-200">
                  Ver todas
                </Link>
              </CardHeader>
              {cuentasActivas.length === 0 ? (
                <EmptyState
                  icon={<Wallet className="size-6" />}
                  title="Sin cuentas todavía"
                  description="Crea tu primera cuenta para ver tus saldos aquí."
                  action={
                    <Link to="/cuentas">
                      <Button size="sm">Crear cuenta</Button>
                    </Link>
                  }
                />
              ) : (
                <ul className="flex flex-col gap-3">
                  {cuentasActivas.slice(0, 6).map((cuenta) => {
                    const meta = CUENTA_TIPO_META[cuenta.tipo]
                    const Icon = meta.icon
                    return (
                      <li key={cuenta.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex size-8 items-center justify-center rounded-lg bg-gradient-to-br ${meta.gradient}`}>
                            <Icon className="size-4 text-white" />
                          </div>
                          <span className="text-sm text-ink-200">{cuenta.nombre}</span>
                        </div>
                        <span className={`font-tabular text-sm font-semibold ${cuenta.es_pasivo ? 'text-coral-400' : 'text-ink-100'}`}>
                          {formatCurrency(cuenta.saldo_actual, cuenta.moneda)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl text-ink-100">Presupuestos activos</h2>
              <Link to="/presupuestos" className="text-xs font-semibold text-violet-300 hover:text-violet-200">
                Ver todos
              </Link>
            </div>
            {(presupuestos ?? []).length === 0 ? (
              <EmptyState
                icon={<Target className="size-6" />}
                title="Sin presupuestos activos"
                description="Crea un presupuesto para controlar cuánto gastas por categoría."
                action={
                  <Link to="/presupuestos">
                    <Button size="sm">Crear presupuesto</Button>
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(presupuestos ?? []).slice(0, 6).map((p) => (
                  <BudgetCard
                    key={p.id}
                    presupuesto={p}
                    categoria={categorias?.find((c) => c.id === p.categoria_id)}
                    moneda={moneda}
                    compact
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

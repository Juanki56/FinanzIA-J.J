import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Target, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { DashboardFilters } from '@/components/dashboard/DashboardFilters'
import { PeriodStats } from '@/components/dashboard/PeriodStats'
import { IncomeExpenseChart } from '@/components/dashboard/IncomeExpenseChart'
import { CategorySpendChart } from '@/components/dashboard/CategorySpendChart'
import { TopExpenses } from '@/components/dashboard/TopExpenses'
import { BudgetCard } from '@/components/budgets/BudgetCard'
import { CUENTA_TIPO_META } from '@/utils/meta'
import { formatCurrency } from '@/utils/currency'
import { etiquetaComparacion, etiquetaPeriodo, periodoAConsulta } from '@/utils/periodo'
import { enPeriodo, esFlujo, serieDelPeriodo, totales } from '@/utils/flujos'
import { useCuentas } from '@/hooks/useCuentas'
import { useMovimientosRango } from '@/hooks/useMovimientos'
import { useCategorias } from '@/hooks/useCategorias'
import { usePresupuestos } from '@/hooks/usePresupuestos'
import { useMe } from '@/hooks/useMe'
import { usePeriodoUrl } from '@/hooks/usePeriodoUrl'

export function DashboardPage() {
  const { data: usuario } = useMe()
  const { data: cuentas, isLoading: cargandoCuentas } = useCuentas()
  const { data: categorias, isLoading: cargandoCats } = useCategorias()
  const { data: presupuestos, isLoading: cargandoPres } = usePresupuestos()

  // El periodo y la cuenta viven en la URL: sobreviven a recargar y se
  // conservan al ir a Categorías y volver.
  const { periodo, anterior, diasCorte, cuentaId, setPeriodo, setCuentaId } = usePeriodoUrl()
  // Una sola consulta cubre el periodo anterior + el actual, para la comparación.
  const consulta = periodoAConsulta({ desde: anterior.desde, hasta: periodo.hasta })
  const { data: movimientos, isLoading: cargandoMovs, isFetching } = useMovimientosRango(consulta.desde, consulta.hasta)

  const moneda = usuario?.moneda_principal ?? 'COP'
  const cuentasActivas = (cuentas ?? []).filter((c) => c.activa)

  const disponible = cuentasActivas
    .filter((c) => !c.es_pasivo && c.incluir_en_saldo_total !== false)
    .reduce((sum, c) => sum + Number(c.saldo_actual), 0)

  const deudas = cuentasActivas
    .filter((c) => c.es_pasivo && c.incluir_en_saldo_total !== false)
    .reduce((sum, c) => sum + Number(c.saldo_actual), 0)

  const datos = useMemo(() => {
    const flujos = (movimientos ?? []).filter((m) => esFlujo(m) && (!cuentaId || m.cuenta_id === cuentaId))
    const actuales = enPeriodo(flujos, periodo)
    const previos = enPeriodo(flujos, anterior)
    const serie = serieDelPeriodo(actuales, periodo)

    return {
      serie,
      totalesActual: totales(actuales),
      totalesAnterior: totales(previos),
      gastos: actuales.filter((m) => m.tipo === 'expense'),
    }
  }, [movimientos, cuentaId, periodo, anterior])

  const cargando = cargandoCuentas || cargandoMovs || cargandoCats || cargandoPres
  const cuentaFiltrada = cuentas?.find((c) => c.id === cuentaId)
  const contexto = `${etiquetaPeriodo(periodo)}${cuentaFiltrada ? ` · ${cuentaFiltrada.nombre}` : ''}`

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
          <section aria-label="Saldos de hoy" className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Hoy</p>
            <SummaryCards disponible={disponible} deudas={deudas} moneda={moneda} />
          </section>

          <section aria-label="Resumen del periodo" className="flex flex-col gap-4">
            <DashboardFilters
              periodo={periodo}
              onPeriodoChange={setPeriodo}
              cuentaId={cuentaId}
              onCuentaChange={setCuentaId}
              cuentas={cuentasActivas}
            />

            <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
              <div className="flex flex-col gap-6">
                <PeriodStats
                  actual={datos.totalesActual}
                  anterior={datos.totalesAnterior}
                  etiquetaAnterior={etiquetaComparacion(anterior, diasCorte)}
                  moneda={moneda}
                />

                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>Ingresos vs. gastos</CardTitle>
                      <p className="text-xs text-ink-500">{contexto}</p>
                    </div>
                  </CardHeader>
                  <IncomeExpenseChart datos={datos.serie} moneda={moneda} />
                </Card>

                <div className="grid gap-6 lg:grid-cols-5">
                  <Card className="lg:col-span-3">
                    <CardHeader>
                      <div>
                        <CardTitle>Gastos por categoría</CardTitle>
                        <p className="text-xs text-ink-500">{contexto}</p>
                      </div>
                    </CardHeader>
                    <CategorySpendChart gastos={datos.gastos} categorias={categorias ?? []} moneda={moneda} />
                  </Card>

                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <div>
                        <CardTitle>Gastos más grandes</CardTitle>
                        <p className="text-xs text-ink-500">{contexto}</p>
                      </div>
                      <Link to="/movimientos" className="text-xs font-semibold text-violet-300 hover:text-violet-200">
                        Ver movimientos
                      </Link>
                    </CardHeader>
                    <TopExpenses gastos={datos.gastos} cuentas={cuentas ?? []} categorias={categorias ?? []} moneda={moneda} />
                  </Card>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-5">
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
                  {cuentasActivas.map((cuenta) => {
                    const meta = CUENTA_TIPO_META[cuenta.tipo]
                    const Icon = meta.icon
                    return (
                      <li key={cuenta.id}>
                        <button
                          onClick={() => setCuentaId(cuenta.id === cuentaId ? '' : cuenta.id)}
                          className={`flex w-full items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white/5 ${
                            cuenta.id === cuentaId ? 'bg-violet-500/15 ring-1 ring-violet-400/40' : ''
                          }`}
                          title={cuenta.id === cuentaId ? 'Quitar filtro de cuenta' : 'Ver solo esta cuenta en el resumen'}
                        >
                          <span className="flex items-center gap-2.5">
                            <span className={`flex size-8 items-center justify-center rounded-lg bg-gradient-to-br ${meta.gradient}`}>
                              <Icon className="size-4 text-white" />
                            </span>
                            <span className="text-sm text-ink-200">{cuenta.nombre}</span>
                          </span>
                          <span className={`font-tabular text-sm font-semibold ${cuenta.es_pasivo ? 'text-coral-400' : 'text-ink-100'}`}>
                            {formatCurrency(cuenta.saldo_actual, cuenta.moneda)}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>

            <div className="lg:col-span-3">
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
                <div className="grid gap-4 sm:grid-cols-2">
                  {(presupuestos ?? []).slice(0, 4).map((p) => (
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
          </div>
        </>
      )}
    </div>
  )
}

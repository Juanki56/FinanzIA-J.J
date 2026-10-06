import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CircleHelp, Receipt } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { DashboardFilters } from '@/components/dashboard/DashboardFilters'
import { DeltaComparacion } from '@/components/dashboard/DeltaComparacion'
import { IncomeExpenseChart } from '@/components/dashboard/IncomeExpenseChart'
import { CategorySpendChart } from '@/components/dashboard/CategorySpendChart'
import { COLOR_GASTO, COLOR_INGRESO } from '@/components/dashboard/chartColors'
import { CATEGORIA_TIPO_META } from '@/utils/meta'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'
import { etiquetaComparacion, etiquetaPeriodo, periodoAConsulta } from '@/utils/periodo'
import {
  enPeriodo,
  esFlujo,
  idsDeCategoria,
  perteneceA,
  serieDelPeriodo,
  SIN_CATEGORIA,
  totales,
} from '@/utils/flujos'
import { useCategorias } from '@/hooks/useCategorias'
import { useCuentas } from '@/hooks/useCuentas'
import { useMovimientosRango } from '@/hooks/useMovimientos'
import { useMe } from '@/hooks/useMe'
import { usePeriodoUrl } from '@/hooks/usePeriodoUrl'
import type { Categoria, TipoCategoria } from '@/types'

const MOVIMIENTOS_VISIBLES = 25

export function CategoryDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { data: usuario } = useMe()
  const { data: categorias, isLoading: cargandoCats } = useCategorias({ incluirInactivas: true })
  const { data: cuentas } = useCuentas()
  const { periodo, anterior, diasCorte, cuentaId, setPeriodo, setCuentaId, queryString } = usePeriodoUrl()
  const [verTodos, setVerTodos] = useState(false)

  const consulta = periodoAConsulta({ desde: anterior.desde, hasta: periodo.hasta })
  const { data: movimientos, isLoading: cargandoMovs, isFetching } = useMovimientosRango(consulta.desde, consulta.hasta)

  const moneda = usuario?.moneda_principal ?? 'COP'
  const esSinCategoria = id === SIN_CATEGORIA
  const categoria: Categoria | undefined = esSinCategoria
    ? { id: SIN_CATEGORIA, nombre: 'Sin categoría', tipo: 'both', categoria_padre_id: null, icono: null, color: null, activa: true }
    : categorias?.find((c) => c.id === id)
  const padre = categoria?.categoria_padre_id ? categorias?.find((c) => c.id === categoria.categoria_padre_id) : undefined
  const subcategorias = (categorias ?? []).filter((c) => c.categoria_padre_id === id)

  const datos = useMemo(() => {
    const ids = idsDeCategoria(id, categorias ?? [])
    const flujos = (movimientos ?? []).filter(
      (m) => esFlujo(m) && perteneceA(m, ids) && (!cuentaId || m.cuenta_id === cuentaId)
    )
    const actuales = enPeriodo(flujos, periodo)
    // Para "X% de tus gastos del periodo": todo lo del periodo, de cualquier categoría.
    const todoElPeriodo = enPeriodo(
      (movimientos ?? []).filter((m) => esFlujo(m) && (!cuentaId || m.cuenta_id === cuentaId)),
      periodo
    )
    return {
      actuales: [...actuales].sort((a, b) => b.fecha_movimiento.localeCompare(a.fecha_movimiento)),
      totalesActual: totales(actuales),
      totalesAnterior: totales(enPeriodo(flujos, anterior)),
      totalesGenerales: totales(todoElPeriodo),
      serie: serieDelPeriodo(actuales, periodo),
    }
  }, [movimientos, categorias, id, cuentaId, periodo, anterior])

  if (cargandoCats || cargandoMovs) return <Spinner />

  const volver = `/categorias${queryString}`

  if (!categoria) {
    return (
      <EmptyState
        icon={<CircleHelp className="size-6" />}
        title="No encontramos esta categoría"
        description="Puede que la hayas eliminado."
        action={
          <Link to={volver} className="text-sm font-semibold text-violet-300 hover:text-violet-200">
            Volver a categorías
          </Link>
        }
      />
    )
  }

  // Qué mostrar según el tipo. Una categoría mixta (o "Sin categoría") muestra
  // solo los lados que de verdad tienen movimientos, o gastos si no hay nada.
  const lados = ladosVisibles(categoria.tipo, datos.totalesActual.ingresos, datos.totalesActual.gastos)
  const meta = CATEGORIA_TIPO_META[categoria.tipo]
  const etiquetaAnterior = etiquetaComparacion(anterior, diasCorte)
  const cantidad = datos.actuales.length
  const visibles = verTodos ? datos.actuales : datos.actuales.slice(0, MOVIMIENTOS_VISIBLES)
  const cuentaFiltrada = cuentas?.find((c) => c.id === cuentaId)
  const contexto = `${etiquetaPeriodo(periodo)}${cuentaFiltrada ? ` · ${cuentaFiltrada.nombre}` : ''}`

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to={volver} className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-ink-200">
          <ArrowLeft className="size-4" />
          Categorías
        </Link>
        <div className="flex items-center gap-3">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-xl text-2xl"
            style={{ backgroundColor: categoria.color ? `${categoria.color}26` : 'rgba(255,255,255,0.06)' }}
          >
            {esSinCategoria ? <CircleHelp className="size-6 text-ink-400" /> : (categoria.icono ?? '🏷️')}
          </div>
          <div className="min-w-0">
            {padre && (
              <Link
                to={`/categorias/${padre.id}${queryString}`}
                className="text-xs text-ink-500 hover:text-ink-300"
              >
                {padre.icono} {padre.nombre} ›
              </Link>
            )}
            <h1 className="truncate font-display text-2xl text-ink-100 sm:text-3xl">{categoria.nombre}</h1>
          </div>
          {!esSinCategoria && (
            <span className="ml-auto flex gap-2">
              <Badge tone={meta.tone}>{meta.label}</Badge>
              {!categoria.activa && <Badge tone="neutral">Inactiva</Badge>}
            </span>
          )}
        </div>
        {subcategorias.length > 0 && (
          <p className="mt-2 text-sm text-ink-500">
            Incluye sus {subcategorias.length} subcategorías: {subcategorias.map((s) => s.nombre).join(', ')}.
          </p>
        )}
      </div>

      <DashboardFilters
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        cuentaId={cuentaId}
        onCuentaChange={setCuentaId}
        cuentas={(cuentas ?? []).filter((c) => c.activa)}
      />

      <div className={`flex flex-col gap-6 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
        <div className="grid gap-4 sm:grid-cols-3">
          {lados.map((lado) => {
            const valor = lado === 'gastos' ? datos.totalesActual.gastos : datos.totalesActual.ingresos
            const general = lado === 'gastos' ? datos.totalesGenerales.gastos : datos.totalesGenerales.ingresos
            return (
              <Card key={lado} className={lados.length === 1 ? 'sm:col-span-2' : ''}>
                <div className="flex items-center gap-2 text-sm text-ink-300">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: lado === 'gastos' ? COLOR_GASTO : COLOR_INGRESO }}
                    aria-hidden
                  />
                  {lado === 'gastos' ? 'Total gastado' : 'Total recibido'} · {etiquetaPeriodo(periodo)}
                </div>
                <p className="my-2 font-display text-4xl leading-tight text-ink-100">{formatCurrency(valor, moneda)}</p>
                <DeltaComparacion
                  actual={valor}
                  previo={lado === 'gastos' ? datos.totalesAnterior.gastos : datos.totalesAnterior.ingresos}
                  subirEsBueno={lado === 'ingresos'}
                  etiquetaAnterior={etiquetaAnterior}
                  moneda={moneda}
                />
                {general > 0 && (
                  <p className="mt-2 text-xs text-ink-500">
                    {((valor / general) * 100).toFixed(1)}% de tus {lado} del periodo ({formatCurrency(general, moneda)})
                  </p>
                )}
              </Card>
            )
          })}
          <Card>
            <p className="text-sm text-ink-300">Movimientos</p>
            <p className="my-2 font-display text-4xl leading-tight text-ink-100">{cantidad}</p>
            <p className="text-xs text-ink-500">
              {cantidad > 0
                ? `Promedio ${formatCurrency(
                    (datos.totalesActual.gastos + datos.totalesActual.ingresos) / cantidad,
                    moneda
                  )} por movimiento`
                : 'Ninguno en este periodo'}
            </p>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>
                {lados.length > 1 ? 'Ingresos y gastos' : lados[0] === 'gastos' ? 'Gasto' : 'Ingreso'} en el tiempo
              </CardTitle>
              <p className="text-xs text-ink-500">{contexto}</p>
            </div>
          </CardHeader>
          <IncomeExpenseChart
            datos={datos.serie}
            moneda={moneda}
            series={lados}
            textoVacio="Sin movimientos de esta categoría en este periodo"
          />
        </Card>

        {subcategorias.length > 0 && (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Por subcategoría</CardTitle>
                <p className="text-xs text-ink-500">
                  {contexto} · "{categoria.nombre}" sola = movimientos sin subcategoría
                </p>
              </div>
            </CardHeader>
            <CategorySpendChart
              gastos={datos.actuales.filter((m) => m.tipo === (lados[0] === 'ingresos' ? 'income' : 'expense'))}
              categorias={categorias ?? []}
              moneda={moneda}
              color={lados[0] === 'ingresos' ? COLOR_INGRESO : COLOR_GASTO}
              textoVacio="Sin movimientos en este periodo"
            />
          </Card>
        )}

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Movimientos</CardTitle>
              <p className="text-xs text-ink-500">{contexto}</p>
            </div>
          </CardHeader>
          {cantidad === 0 ? (
            <EmptyState
              icon={<Receipt className="size-6" />}
              title="Sin movimientos en este periodo"
              description="Prueba con el mes anterior o con otro rango de fechas."
            />
          ) : (
            <>
              <ul className="flex flex-col divide-y divide-white/5">
                {visibles.map((mov) => {
                  const cuenta = cuentas?.find((c) => c.id === mov.cuenta_id)
                  const sub = mov.categoria_id && mov.categoria_id !== id ? categorias?.find((c) => c.id === mov.categoria_id) : undefined
                  return (
                    <li key={mov.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-ink-100">
                          {mov.comercio || mov.descripcion || (mov.tipo === 'income' ? 'Ingreso' : 'Gasto')}
                        </p>
                        <p className="truncate text-xs text-ink-500">
                          {formatDate(mov.fecha_movimiento)}
                          {cuenta && ` · ${cuenta.nombre}`}
                          {sub && ` · ${sub.icono ?? ''} ${sub.nombre}`.trimEnd()}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 font-tabular text-sm font-semibold ${
                          mov.tipo === 'income' ? 'text-mint-400' : 'text-ink-100'
                        }`}
                      >
                        {mov.tipo === 'income' ? '+' : '−'}
                        {formatCurrency(Number(mov.monto), moneda)}
                      </span>
                    </li>
                  )
                })}
              </ul>
              {cantidad > MOVIMIENTOS_VISIBLES && (
                <button
                  onClick={() => setVerTodos((v) => !v)}
                  className="mt-3 text-sm font-semibold text-violet-300 hover:text-violet-200"
                >
                  {verTodos ? 'Mostrar menos' : `Mostrar los ${cantidad}`}
                </button>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

function ladosVisibles(tipo: TipoCategoria, ingresos: number, gastos: number): ('ingresos' | 'gastos')[] {
  if (tipo === 'expense') return ['gastos']
  if (tipo === 'income') return ['ingresos']
  const lados: ('ingresos' | 'gastos')[] = []
  if (ingresos > 0) lados.push('ingresos')
  if (gastos > 0 || lados.length === 0) lados.push('gastos')
  return lados
}

import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { CheckCheck, ListChecks, Sparkles, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useMovimientosRevision, useActualizarMovimientosEnLote } from '@/hooks/useMovimientos'
import { useCuentas } from '@/hooks/useCuentas'
import { useCategorias } from '@/hooks/useCategorias'
import { useCrearRegla } from '@/hooks/useReglas'
import { buildCategoryOptions } from '@/utils/categoryTree'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'
import { notifyError, notifySuccess } from '@/utils/toast'
import type { Movimiento } from '@/types'

type Filtro = 'todo' | 'confirmar' | 'categoria' | 'cubiertos'

interface SugerenciaRegla {
  comercio: string
  tipo: 'income' | 'expense'
  categoriaId: string
  categoriaNombre: string
  /** Otros movimientos del mismo comercio que siguen sin categoría. */
  otrosIds: string[]
}

export function ReviewPage() {
  const { data, isLoading } = useMovimientosRevision()
  const { data: cuentas } = useCuentas()
  const { data: categorias } = useCategorias()
  const lote = useActualizarMovimientosEnLote()
  const crearRegla = useCrearRegla()

  const [filtro, setFiltro] = useState<Filtro>('todo')
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [categoriaLote, setCategoriaLote] = useState('')
  const [sugerencia, setSugerencia] = useState<SugerenciaRegla | null>(null)
  const [confirmandoLote, setConfirmandoLote] = useState(false)

  const movimientos = useMemo(() => data?.movimientos ?? [], [data])
  const cuentaPorId = useMemo(() => new Map((cuentas ?? []).map((c) => [c.id, c])), [cuentas])
  const categoriaPorId = useMemo(() => new Map((categorias ?? []).map((c) => [c.id, c])), [categorias])

  // Un pendiente con fecha anterior al último ajuste de su cuenta (o a su
  // creación) ya está incluido en el saldo: confirmarlo lo contaría dos veces.
  function estaCubierto(m: Movimiento) {
    const desde = cuentaPorId.get(m.cuenta_id)?.pendientes_desde
    return m.estado === 'pending' && !!desde && new Date(m.fecha_movimiento) <= new Date(desde)
  }

  const grupos = {
    todo: movimientos,
    confirmar: movimientos.filter((m) => m.estado === 'pending' && !estaCubierto(m)),
    categoria: movimientos.filter((m) => !m.categoria_id),
    cubiertos: movimientos.filter(estaCubierto),
  }
  const visibles = grupos[filtro]
  const seleccionados = movimientos.filter((m) => seleccion.has(m.id))
  const tiposSeleccion = new Set(seleccionados.map((m) => m.tipo))
  const tipoComun = tiposSeleccion.size === 1 ? (seleccionados[0]?.tipo as 'income' | 'expense') : undefined

  function alternar(id: string) {
    const nueva = new Set(seleccion)
    if (nueva.has(id)) nueva.delete(id)
    else nueva.add(id)
    setSeleccion(nueva)
  }

  function alternarTodos() {
    const todosMarcados = visibles.length > 0 && visibles.every((m) => seleccion.has(m.id))
    setSeleccion(todosMarcados ? new Set() : new Set(visibles.map((m) => m.id)))
  }

  function categorizar(m: Movimiento, categoriaId: string) {
    lote.mutate(
      { ids: [m.id], cambios: { categoria_id: categoriaId || null } },
      {
        onSuccess: () => {
          const categoria = categoriaPorId.get(categoriaId)
          // Ofrecer la regla solo si hay un comercio con qué reconocerlo.
          if (!categoria || !m.comercio || (m.tipo !== 'income' && m.tipo !== 'expense')) return
          setSugerencia({
            comercio: m.comercio,
            tipo: m.tipo,
            categoriaId,
            categoriaNombre: categoria.nombre,
            otrosIds: movimientos
              .filter((o) => o.id !== m.id && o.comercio === m.comercio && o.tipo === m.tipo && !o.categoria_id)
              .map((o) => o.id),
          })
        },
        onError: (err) => notifyError(err),
      }
    )
  }

  async function aceptarSugerencia() {
    if (!sugerencia) return
    try {
      await crearRegla.mutateAsync({
        nombre: `${sugerencia.comercio} → ${sugerencia.categoriaNombre}`,
        categoria_id: sugerencia.categoriaId,
        valor: sugerencia.comercio,
        campo_objetivo: 'comercio',
        operador: 'equals',
      })
      if (sugerencia.otrosIds.length > 0) {
        await lote.mutateAsync({ ids: sugerencia.otrosIds, cambios: { categoria_id: sugerencia.categoriaId } })
      }
      notifySuccess(
        sugerencia.otrosIds.length > 0
          ? `Listo: regla creada y ${sugerencia.otrosIds.length} movimiento${sugerencia.otrosIds.length === 1 ? '' : 's'} más categorizado${sugerencia.otrosIds.length === 1 ? '' : 's'} ✨`
          : 'Listo: los próximos movimientos de este comercio llegarán categorizados ✨'
      )
      setSugerencia(null)
    } catch (err) {
      notifyError(err)
    }
  }

  function asignarCategoriaLote() {
    if (!categoriaLote || seleccion.size === 0) return
    lote.mutate(
      { ids: [...seleccion], cambios: { categoria_id: categoriaLote } },
      {
        onSuccess: (r) => {
          notifySuccess(`Categoría asignada a ${r.actualizados} movimiento${r.actualizados === 1 ? '' : 's'}`)
          setSeleccion(new Set())
          setCategoriaLote('')
        },
        onError: (err) => notifyError(err),
      }
    )
  }

  const pendientesSeleccionados = seleccionados.filter((m) => m.estado === 'pending')
  const confirmables = pendientesSeleccionados.filter((m) => !estaCubierto(m))
  const cubiertosSeleccionados = pendientesSeleccionados.length - confirmables.length

  function confirmarLote() {
    if (confirmables.length === 0) return
    lote.mutate(
      { ids: confirmables.map((m) => m.id), cambios: { estado: 'confirmed' } },
      {
        onSuccess: (r) => {
          notifySuccess(`${r.actualizados} movimiento${r.actualizados === 1 ? '' : 's'} confirmado${r.actualizados === 1 ? '' : 's'} ✅`)
          setSeleccion(new Set())
          setConfirmandoLote(false)
        },
        onError: (err) => notifyError(err),
      }
    )
  }

  const FILTROS: { id: Filtro; etiqueta: string }[] = [
    { id: 'todo', etiqueta: 'Todo' },
    { id: 'confirmar', etiqueta: 'Por confirmar' },
    { id: 'categoria', etiqueta: 'Sin categoría' },
    { id: 'cubiertos', etiqueta: 'Ya en tu saldo' },
  ]

  return (
    <div>
      <PageHeader
        title="Revisar"
        description="Confirma lo que llegó del banco y ponle categoría a lo que no tiene, de a varios a la vez."
      />

      {isLoading ? (
        <Spinner />
      ) : movimientos.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="size-7" />}
          title="¡Todo al día!"
          description="No tienes movimientos pendientes ni sin categoría."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {sugerencia && (
            <Card className="flex flex-col gap-3 ring-1 ring-violet-500/40 sm:flex-row sm:items-center">
              <Sparkles className="size-5 shrink-0 text-violet-300" />
              <p className="flex-1 text-sm text-ink-200">
                ¿Categorizar siempre <strong className="text-ink-100">«{sugerencia.comercio}»</strong> como{' '}
                <strong className="text-ink-100">{sugerencia.categoriaNombre}</strong>? Los próximos correos de ese
                comercio llegarán ya categorizados
                {sugerencia.otrosIds.length > 0 &&
                  `, y se aplicará a ${sugerencia.otrosIds.length} movimiento${sugerencia.otrosIds.length === 1 ? '' : 's'} más que tienes sin categoría`}
                .
              </p>
              <div className="flex shrink-0 gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSugerencia(null)}>
                  No
                </Button>
                <Button size="sm" loading={crearRegla.isPending} onClick={aceptarSugerencia}>
                  Sí, siempre
                </Button>
              </div>
            </Card>
          )}

          <div className="flex flex-wrap gap-2">
            {FILTROS.map(({ id, etiqueta }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setFiltro(id)
                  setSeleccion(new Set())
                }}
                className={clsx(
                  'rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition',
                  filtro === id
                    ? 'bg-violet-500/20 text-ink-100 ring-violet-500/40'
                    : 'text-ink-400 ring-white/10 hover:text-ink-200'
                )}
              >
                {etiqueta} · {grupos[id].length}
              </button>
            ))}
          </div>

          {filtro === 'cubiertos' && (
            <p className="rounded-xl bg-white/[0.04] px-4 py-3 text-xs text-ink-400">
              Estos pendientes son anteriores al último ajuste de saldo de su cuenta (o a cuando la creaste), así que
              ya están incluidos en el saldo. Puedes ponerles categoría, pero no confirmarlos: se contarían dos veces.
            </p>
          )}

          {seleccion.size > 0 && (
            <Card className="sticky top-2 z-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <span className="text-sm text-ink-200">
                {seleccion.size} seleccionado{seleccion.size === 1 ? '' : 's'}
              </span>
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <select
                  value={categoriaLote}
                  disabled={!tipoComun}
                  onChange={(e) => setCategoriaLote(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-bg-raised px-3 py-1.5 text-sm text-ink-100 outline-none focus:border-violet-400 disabled:opacity-50"
                  title={tipoComun ? undefined : 'Selecciona solo gastos o solo ingresos para asignar categoría'}
                >
                  <option value="">{tipoComun ? 'Elige una categoría…' : 'Mezclaste gastos e ingresos'}</option>
                  {buildCategoryOptions(categorias, tipoComun).map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="secondary" disabled={!categoriaLote} loading={lote.isPending} onClick={asignarCategoriaLote}>
                  Asignar
                </Button>
                <Button
                  size="sm"
                  disabled={pendientesSeleccionados.length === 0}
                  onClick={() => (cubiertosSeleccionados > 0 ? setConfirmandoLote(true) : confirmarLote())}
                >
                  <CheckCheck className="size-4" />
                  Confirmar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSeleccion(new Set())} aria-label="Quitar selección">
                  <X className="size-4" />
                </Button>
              </div>
            </Card>
          )}

          <Card className="p-2 sm:p-3">
            <label className="flex items-center gap-3 px-3 py-2 text-xs text-ink-400">
              <input
                type="checkbox"
                className="size-4 accent-violet-500"
                checked={visibles.length > 0 && visibles.every((m) => seleccion.has(m.id))}
                onChange={alternarTodos}
              />
              Seleccionar todos ({visibles.length})
            </label>
            <ul className="flex flex-col">
              {visibles.map((m) => {
                const cuenta = cuentaPorId.get(m.cuenta_id)
                const cubierto = estaCubierto(m)
                const tipo = m.tipo === 'income' ? 'income' : 'expense'
                return (
                  <li
                    key={m.id}
                    className={clsx(
                      'flex flex-col gap-2 rounded-xl px-3 py-3 sm:flex-row sm:items-center sm:gap-3',
                      seleccion.has(m.id) ? 'bg-violet-500/10' : 'hover:bg-white/[0.03]'
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <input
                        type="checkbox"
                        className="size-4 shrink-0 accent-violet-500"
                        checked={seleccion.has(m.id)}
                        onChange={() => alternar(m.id)}
                        aria-label="Seleccionar movimiento"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-100">{m.descripcion || m.comercio || 'Movimiento'}</p>
                        <p className="truncate text-xs text-ink-500">
                          {cuenta?.nombre ?? '—'} · {formatDate(m.fecha_movimiento)}
                          {m.comercio && m.descripcion && ` · ${m.comercio}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-7 sm:pl-0">
                      {m.estado === 'pending' &&
                        (cubierto ? <Badge tone="neutral">Ya en tu saldo</Badge> : <Badge tone="amber">Pendiente</Badge>)}
                      <select
                        value={m.categoria_id ?? ''}
                        onChange={(e) => categorizar(m, e.target.value)}
                        className="w-40 rounded-lg border border-white/10 bg-bg-raised px-2 py-1.5 text-xs text-ink-100 outline-none focus:border-violet-400"
                        aria-label="Categoría"
                      >
                        <option value="">Sin categoría</option>
                        {buildCategoryOptions(categorias, tipo).map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <span
                        className={clsx(
                          'font-tabular w-28 shrink-0 text-right text-sm font-semibold',
                          m.tipo === 'income' ? 'text-mint-400' : 'text-coral-400'
                        )}
                      >
                        {m.tipo === 'income' ? '+' : '−'}
                        {formatCurrency(Number(m.monto), cuenta?.moneda)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>

          {data && data.total > movimientos.length && (
            <p className="text-center text-xs text-ink-500">
              Mostrando {movimientos.length} de {data.total}. Al revisar estos, aparecerán los siguientes.
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmandoLote}
        onClose={() => setConfirmandoLote(false)}
        onConfirm={confirmables.length > 0 ? confirmarLote : () => setConfirmandoLote(false)}
        danger={false}
        title="Confirmar movimientos"
        description={
          confirmables.length > 0
            ? `${cubiertosSeleccionados} de los seleccionados ya están incluidos en tu saldo (son anteriores a tu último ajuste) y no se confirmarán, para no contarlos dos veces. Se confirmarán los otros ${confirmables.length}.`
            : `Los ${cubiertosSeleccionados} seleccionados ya están incluidos en tu saldo (son anteriores a tu último ajuste). Confirmarlos los contaría dos veces, así que no hay nada que confirmar.`
        }
        confirmLabel={confirmables.length > 0 ? `Confirmar ${confirmables.length}` : 'Entendido'}
        loading={lote.isPending}
      />
    </div>
  )
}

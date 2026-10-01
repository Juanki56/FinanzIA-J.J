import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, CircleHelp, Plus, Tags, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CategoryForm, type CategoryFormValues } from '@/components/categories/CategoryForm'
import { CategoryTreeView, MontoCategoria } from '@/components/categories/CategoryTreeView'
import { DashboardFilters } from '@/components/dashboard/DashboardFilters'
import { buildCategoryTree } from '@/utils/categoryTree'
import {
  useActualizarCategoria,
  useCategorias,
  useCrearCategoria,
  useEliminarCategoria,
} from '@/hooks/useCategorias'
import { ApiError } from '@/lib/apiClient'
import { notifyError, notifySuccess } from '@/utils/toast'
import { CATEGORIAS_SUGERIDAS } from '@/utils/meta'
import { formatCurrency } from '@/utils/currency'
import { etiquetaPeriodo, periodoAConsulta } from '@/utils/periodo'
import { esFlujo, enPeriodo, resumenPorCategoria, totales, SIN_CATEGORIA } from '@/utils/flujos'
import { useCuentas } from '@/hooks/useCuentas'
import { useMovimientosRango } from '@/hooks/useMovimientos'
import { useMe } from '@/hooks/useMe'
import { usePeriodoUrl } from '@/hooks/usePeriodoUrl'
import type { Categoria } from '@/types'

export function CategoriesPage() {
  const { data: categorias, isLoading } = useCategorias({ incluirInactivas: true })
  const crear = useCrearCategoria()
  const actualizar = useActualizarCategoria()
  const eliminar = useEliminarCategoria()

  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Categoria | null>(null)
  const [padrePreseleccionado, setPadrePreseleccionado] = useState<Categoria | null>(null)
  const [eliminando, setEliminando] = useState<Categoria | null>(null)
  const [sugerirDesactivar, setSugerirDesactivar] = useState<Categoria | null>(null)
  const [creandoSugeridas, setCreandoSugeridas] = useState(false)

  const { data: usuario } = useMe()
  const { data: cuentas } = useCuentas()
  const { periodo, cuentaId, setPeriodo, setCuentaId, queryString } = usePeriodoUrl()
  const consulta = periodoAConsulta(periodo)
  const { data: movimientos, isFetching } = useMovimientosRango(consulta.desde, consulta.hasta)
  const moneda = usuario?.moneda_principal ?? 'COP'

  // Totales del periodo por categoría; cada padre incluye a sus subcategorías.
  const { resumen, totalesPeriodo } = useMemo(() => {
    const flujos = enPeriodo(
      (movimientos ?? []).filter((m) => esFlujo(m) && (!cuentaId || m.cuenta_id === cuentaId)),
      periodo
    )
    return { resumen: resumenPorCategoria(flujos, categorias ?? []), totalesPeriodo: totales(flujos) }
  }, [movimientos, cuentaId, periodo, categorias])
  const sinCategoria = resumen.get(SIN_CATEGORIA)

  const nodos = buildCategoryTree(categorias)
  const raices = (categorias ?? []).filter((c) => !c.categoria_padre_id)

  function abrirCrear(padre?: Categoria) {
    setEditando(null)
    setPadrePreseleccionado(padre ?? null)
    setModalOpen(true)
  }

  function abrirEditar(categoria: Categoria) {
    setEditando(categoria)
    setPadrePreseleccionado(null)
    setModalOpen(true)
  }

  function onSubmit(values: CategoryFormValues) {
    const payload = {
      nombre: values.nombre,
      tipo: values.tipo,
      categoria_padre_id: values.categoria_padre_id || undefined,
      icono: values.icono || undefined,
      color: values.color || undefined,
    }

    if (editando) {
      actualizar.mutate(
        { id: editando.id, cambios: payload },
        {
          onSuccess: () => {
            notifySuccess('¡Categoría actualizada!')
            setModalOpen(false)
          },
          onError: (err) => notifyError(err),
        }
      )
    } else {
      crear.mutate(payload, {
        onSuccess: () => {
          notifySuccess('¡Categoría creada! 🏷️')
          setModalOpen(false)
        },
        onError: (err) => notifyError(err),
      })
    }
  }

  function onToggleActiva(categoria: Categoria) {
    actualizar.mutate(
      { id: categoria.id, cambios: { activa: !categoria.activa } },
      {
        onSuccess: () => notifySuccess(categoria.activa ? 'Categoría desactivada.' : 'Categoría reactivada.'),
        onError: (err) => notifyError(err),
      }
    )
  }

  function onDelete(categoria: Categoria) {
    setEliminando(categoria)
  }

  function confirmarEliminar() {
    if (!eliminando) return
    eliminar.mutate(eliminando.id, {
      onSuccess: () => {
        notifySuccess('Categoría eliminada.')
        setEliminando(null)
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) {
          setSugerirDesactivar(eliminando)
          setEliminando(null)
        } else {
          notifyError(err)
          setEliminando(null)
        }
      },
    })
  }

  function confirmarDesactivarComoAlternativa() {
    if (!sugerirDesactivar) return
    actualizar.mutate(
      { id: sugerirDesactivar.id, cambios: { activa: false } },
      {
        onSuccess: () => {
          notifySuccess('Categoría desactivada. Ya no aparecerá para nuevos movimientos.')
          setSugerirDesactivar(null)
        },
        onError: (err) => notifyError(err),
      }
    )
  }

  async function crearSugeridas() {
    setCreandoSugeridas(true)
    try {
      const existentes = new Set((categorias ?? []).map((c) => c.nombre.toLowerCase()))
      const faltantes = CATEGORIAS_SUGERIDAS.filter((s) => !existentes.has(s.nombre.toLowerCase()))
      for (const sugerida of faltantes) {
        await crear.mutateAsync({ nombre: sugerida.nombre, tipo: sugerida.tipo, icono: sugerida.icono })
      }
      notifySuccess(faltantes.length ? '¡Categorías sugeridas creadas! 🎉' : 'Ya tenías todas las sugeridas.')
    } catch (err) {
      notifyError(err)
    } finally {
      setCreandoSugeridas(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Categorías"
        description="Organiza tus ingresos y gastos para entender mejor tus finanzas."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={crearSugeridas} loading={creandoSugeridas}>
              <Sparkles className="size-4" />
              Usar sugeridas
            </Button>
            <Button onClick={() => abrirCrear()}>
              <Plus className="size-4" />
              Nueva categoría
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : (categorias ?? []).length === 0 ? (
        <EmptyState
          icon={<Tags className="size-6" />}
          title="Todavía no tienes categorías"
          description="¡Creemos la primera! O usa nuestras sugeridas para empezar rápido."
          action={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={crearSugeridas} loading={creandoSugeridas}>
                <Sparkles className="size-4" />
                Usar sugeridas
              </Button>
              <Button onClick={() => abrirCrear()}>
                <Plus className="size-4" />
                Crear una
              </Button>
            </div>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          <DashboardFilters
            periodo={periodo}
            onPeriodoChange={setPeriodo}
            cuentaId={cuentaId}
            onCuentaChange={setCuentaId}
            cuentas={(cuentas ?? []).filter((c) => c.activa)}
          />

          <p className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-sm text-ink-400">
            <span>{etiquetaPeriodo(periodo)}:</span>
            <span>
              Gastos <strong className="font-tabular font-semibold text-ink-100">{formatCurrency(totalesPeriodo.gastos, moneda)}</strong>
            </span>
            <span>
              Ingresos <strong className="font-tabular font-semibold text-ink-100">{formatCurrency(totalesPeriodo.ingresos, moneda)}</strong>
            </span>
            <span className="text-ink-500">Toca una categoría para ver su detalle.</span>
          </p>

          <Card className={`p-2 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
            <CategoryTreeView
              nodos={nodos}
              onEdit={abrirEditar}
              onAddChild={abrirCrear}
              onToggleActiva={onToggleActiva}
              onDelete={onDelete}
              resumen={resumen}
              moneda={moneda}
              hrefDetalle={(c) => `/categorias/${c.id}${queryString}`}
            />
            {sinCategoria && (
              <div className="border-t border-white/5 py-1">
                <Link
                  to={`/categorias/${SIN_CATEGORIA}${queryString}`}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.03]"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                    <CircleHelp className="size-4 text-ink-400" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-ink-300">Sin categoría</span>
                  <MontoCategoria categoria={{ tipo: 'both' }} resumen={sinCategoria} moneda={moneda} />
                  <ChevronRight className="size-4 text-ink-500 group-hover:text-ink-200" aria-hidden />
                </Link>
              </div>
            )}
          </Card>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? 'Editar categoría' : padrePreseleccionado ? `Nueva subcategoría de "${padrePreseleccionado.nombre}"` : 'Nueva categoría'}
      >
        <CategoryForm
          categoria={
            editando ??
            (padrePreseleccionado
              ? ({ categoria_padre_id: padrePreseleccionado.id, tipo: padrePreseleccionado.tipo } as Categoria)
              : undefined)
          }
          categoriasRaiz={raices}
          onSubmit={onSubmit}
          onCancel={() => setModalOpen(false)}
          submitting={crear.isPending || actualizar.isPending}
        />
      </Modal>

      <ConfirmDialog
        open={!!eliminando}
        onClose={() => setEliminando(null)}
        onConfirm={confirmarEliminar}
        title="Eliminar categoría"
        description={`"${eliminando?.nombre}" se eliminará por completo. Si tiene movimientos o subcategorías, te ofreceremos desactivarla en su lugar.`}
        confirmLabel="Eliminar"
        loading={eliminar.isPending}
      />

      <ConfirmDialog
        open={!!sugerirDesactivar}
        onClose={() => setSugerirDesactivar(null)}
        onConfirm={confirmarDesactivarComoAlternativa}
        title="No se puede eliminar"
        description={`"${sugerirDesactivar?.nombre}" tiene movimientos o subcategorías asociadas, así que no se puede borrar del todo. ¿Quieres desactivarla en su lugar? Dejará de aparecer para nuevos movimientos, pero conservará tu historial.`}
        confirmLabel="Desactivar"
        danger={false}
        loading={actualizar.isPending}
      />
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Plus, Receipt } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Pagination } from '@/components/ui/Pagination'
import { MovementFilters, type MovementFiltersState } from '@/components/movements/MovementFilters'
import { MovementRow } from '@/components/movements/MovementRow'
import { MovementForm, type MovementFormValues } from '@/components/movements/MovementForm'
import { useCuentas } from '@/hooks/useCuentas'
import { useCategorias } from '@/hooks/useCategorias'
import {
  useCrearMovimiento,
  useActualizarMovimiento,
  useEliminarMovimiento,
  useMovimientos,
  type NuevoMovimientoInput,
} from '@/hooks/useMovimientos'
import { notifyError, notifySuccess } from '@/utils/toast'
import { dateOnlyLocal } from '@/utils/date'
import type { Movimiento } from '@/types'

const FILTROS_VACIOS: MovementFiltersState = { cuentaId: '', categoriaId: '', tipo: '', desde: '', hasta: '' }
const LIMITE_POR_PAGINA = 20

export function MovementsPage() {
  const [pagina, setPagina] = useState(1)
  const { data, isLoading: cargandoMovs, isPlaceholderData } = useMovimientos({ pagina, limite: LIMITE_POR_PAGINA })
  const movimientos = data?.movimientos
  const paginacion = data?.paginacion
  const { data: cuentas, isLoading: cargandoCuentas } = useCuentas()
  const { data: categorias, isLoading: cargandoCats } = useCategorias()

  const crear = useCrearMovimiento()
  const actualizar = useActualizarMovimiento()
  const eliminar = useEliminarMovimiento()

  const [filtros, setFiltros] = useState<MovementFiltersState>(FILTROS_VACIOS)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Movimiento | null>(null)
  const [eliminando, setEliminando] = useState<Movimiento | null>(null)

  const cargando = cargandoMovs || cargandoCuentas || cargandoCats

  const cuentaPorId = useMemo(() => new Map((cuentas ?? []).map((c) => [c.id, c])), [cuentas])
  const categoriaPorId = useMemo(() => new Map((categorias ?? []).map((c) => [c.id, c])), [categorias])

  function actualizarFiltros(nuevos: MovementFiltersState) {
    setFiltros(nuevos)
    setPagina(1) // los filtros se aplican solo dentro de la página actual, así que volvemos a la 1
  }

  const filtrados = useMemo(() => {
    return (movimientos ?? []).filter((m) => {
      if (filtros.cuentaId && m.cuenta_id !== filtros.cuentaId) return false
      if (filtros.categoriaId && m.categoria_id !== filtros.categoriaId) return false
      if (filtros.tipo && m.tipo !== filtros.tipo) return false
      if (filtros.desde && dateOnlyLocal(m.fecha_movimiento) < filtros.desde) return false
      if (filtros.hasta && dateOnlyLocal(m.fecha_movimiento) > filtros.hasta) return false
      return true
    })
  }, [movimientos, filtros])

  const hayFiltrosActivos = Object.values(filtros).some(Boolean)

  function abrirCrear() {
    setEditando(null)
    setModalOpen(true)
  }

  function abrirEditar(mov: Movimiento) {
    setEditando(mov)
    setModalOpen(true)
  }

  function onSubmit(values: MovementFormValues) {
    const payloadBase = {
      categoria_id: values.categoria_id || undefined,
      monto: values.monto,
      descripcion: values.descripcion || undefined,
      comercio: values.comercio || undefined,
      fecha_movimiento: values.fecha_movimiento,
      estado: values.estado,
      ...(values.tipo === 'adjustment' ? { signo: values.signo === '-1' ? (-1 as const) : (1 as const) } : {}),
    }

    if (editando) {
      actualizar.mutate(
        { id: editando.id, cambios: payloadBase },
        {
          onSuccess: () => {
            notifySuccess('¡Movimiento actualizado! ✅')
            setModalOpen(false)
          },
          onError: (err) => notifyError(err),
        }
      )
    } else {
      const input: NuevoMovimientoInput = {
        cuenta_id: values.cuenta_id,
        tipo: values.tipo,
        ...payloadBase,
      }
      crear.mutate(input, {
        onSuccess: () => {
          notifySuccess(values.tipo === 'expense' ? '¡Listo! Ya quedó anotado el gasto 🎮' : values.tipo === 'income' ? '¡Cha-ching! Ingreso registrado 💰' : 'Ajuste registrado ✅')
          setModalOpen(false)
        },
        onError: (err) => notifyError(err),
      })
    }
  }

  function confirmarEliminar() {
    if (!eliminando) return
    eliminar.mutate(eliminando.id, {
      onSuccess: () => {
        notifySuccess('Movimiento eliminado.')
        setEliminando(null)
      },
      onError: (err) => notifyError(err),
    })
  }

  return (
    <div>
      <PageHeader
        title="Movimientos"
        description="Todos tus ingresos, gastos y ajustes en un solo lugar."
        action={
          <Button onClick={abrirCrear}>
            <Plus className="size-4" />
            Nuevo movimiento
          </Button>
        }
      />

      <Card className="mb-2">
        <MovementFilters value={filtros} onChange={actualizarFiltros} cuentas={cuentas ?? []} categorias={categorias ?? []} />
      </Card>
      {hayFiltrosActivos && (
        <p className="mb-4 text-xs text-ink-500">
          Los filtros se aplican solo dentro de la página actual de resultados.
        </p>
      )}

      {cargando ? (
        <Spinner />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={<Receipt className="size-6" />}
          title={movimientos?.length ? 'Nada coincide con estos filtros' : 'Todavía no tienes movimientos'}
          description={movimientos?.length ? 'Prueba ajustando los filtros de arriba o cambiando de página.' : 'Registra tu primer ingreso o gasto para empezar.'}
          action={
            !movimientos?.length ? (
              <Button onClick={abrirCrear}>
                <Plus className="size-4" />
                Registrar el primero
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className={`divide-y divide-white/5 p-2 transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}>
          {filtrados.map((mov) => (
            <MovementRow
              key={mov.id}
              movimiento={mov}
              cuenta={cuentaPorId.get(mov.cuenta_id)}
              categoria={mov.categoria_id ? categoriaPorId.get(mov.categoria_id) : undefined}
              onEdit={() => abrirEditar(mov)}
              onDelete={() => setEliminando(mov)}
            />
          ))}
        </Card>
      )}

      {paginacion && <Pagination paginacion={paginacion} onChange={setPagina} />}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar movimiento' : 'Nuevo movimiento'} maxWidth="max-w-xl">
        <MovementForm
          movimiento={editando ?? undefined}
          cuentas={cuentas ?? []}
          categorias={categorias ?? []}
          onSubmit={onSubmit}
          onCancel={() => setModalOpen(false)}
          submitting={crear.isPending || actualizar.isPending}
        />
      </Modal>

      <ConfirmDialog
        open={!!eliminando}
        onClose={() => setEliminando(null)}
        onConfirm={confirmarEliminar}
        title="Eliminar movimiento"
        description="Esta acción quitará el movimiento de tus registros y ajustará el saldo de la cuenta."
        confirmLabel="Eliminar"
        loading={eliminar.isPending}
      />
    </div>
  )
}

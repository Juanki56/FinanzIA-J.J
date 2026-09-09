import { useState } from 'react'
import { Plus, Tags, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CategoryForm, type CategoryFormValues } from '@/components/categories/CategoryForm'
import { CategoryTreeView } from '@/components/categories/CategoryTreeView'
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
        <Card className="p-2">
          <CategoryTreeView
            nodos={nodos}
            onEdit={abrirEditar}
            onAddChild={abrirCrear}
            onToggleActiva={onToggleActiva}
            onDelete={onDelete}
          />
        </Card>
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

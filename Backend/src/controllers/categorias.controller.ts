import type { Request, Response } from 'express';

const TIPOS_VALIDOS = ['income', 'expense', 'both'];

export async function listarCategorias(req: Request, res: Response) {
  const incluirInactivas = req.query.incluir_inactivas === 'true';

  let query = req.supabase.from('categorias').select('*').order('nombre', { ascending: true });

  if (!incluirInactivas) {
    query = query.eq('activa', true);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: 'Error al consultar las categorías' });
  }

  res.json({ categorias: data });
}

export async function crearCategoria(req: Request, res: Response) {
  const { nombre, tipo, categoria_padre_id, icono, color } = req.body ?? {};

  if (typeof nombre !== 'string' || !nombre.trim()) {
    return res.status(400).json({ error: 'El campo nombre es obligatorio' });
  }

  if (typeof tipo !== 'string' || !TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ error: `tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}` });
  }

  const nuevaCategoria: Record<string, unknown> = {
    usuario_id: req.usuario.id,
    nombre: nombre.trim(),
    tipo,
  };

  if (categoria_padre_id !== undefined) nuevaCategoria.categoria_padre_id = categoria_padre_id;
  if (icono !== undefined) nuevaCategoria.icono = icono;
  if (color !== undefined) nuevaCategoria.color = color;

  const { data, error } = await req.supabase
    .from('categorias')
    .insert(nuevaCategoria)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: 'Error al crear la categoría', detalle: error.message });
  }

  res.status(201).json({ categoria: data });
}

export async function actualizarCategoria(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body ?? {};

  if ('usuario_id' in body) {
    return res.status(400).json({ error: 'usuario_id no se puede modificar' });
  }

  if ('tipo' in body && !TIPOS_VALIDOS.includes(body.tipo)) {
    return res.status(400).json({ error: `tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}` });
  }

  const { data, error } = await req.supabase
    .from('categorias')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    return res.status(400).json({ error: 'Error al actualizar la categoría', detalle: error.message });
  }

  res.json({ categoria: data });
}

export async function eliminarCategoria(req: Request, res: Response) {
  const { id } = req.params;

  const [{ count: movCount }, { count: hijosCount }] = await Promise.all([
    req.supabase.from('movimientos').select('id', { count: 'exact', head: true }).eq('categoria_id', id),
    req.supabase.from('categorias').select('id', { count: 'exact', head: true }).eq('categoria_padre_id', id),
  ]);

  if ((movCount && movCount > 0) || (hijosCount && hijosCount > 0)) {
    return res.status(409).json({
      error: 'No se puede eliminar una categoría con movimientos o subcategorías asociadas. Desactívala en su lugar (PATCH activa: false).',
    });
  }

  const { error } = await req.supabase.from('categorias').delete().eq('id', id);

  if (error) {
    return res.status(500).json({ error: 'Error al eliminar la categoría', detalle: error.message });
  }

  res.status(204).send();
}
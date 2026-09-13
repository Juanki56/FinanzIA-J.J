import type { Request, Response } from 'express';

const CAMPOS_VALIDOS = ['comercio', 'descripcion', 'remitente', 'asunto'];
const OPERADORES_VALIDOS = ['equals', 'contains', 'starts_with', 'ends_with'];

export async function listarReglas(req: Request, res: Response) {
  const { data, error } = await req.supabase
    .from('reglas_categorizacion')
    .select('*')
    .order('prioridad', { ascending: true });

  if (error) {
    return res.status(500).json({ error: 'Error al consultar las reglas de categorización' });
  }

  res.json({ reglas: data });
}

export async function crearRegla(req: Request, res: Response) {
  const { nombre, categoria_id, valor, campo_objetivo, operador, prioridad } = req.body ?? {};

  if (typeof nombre !== 'string' || !nombre.trim()) {
    return res.status(400).json({ error: 'El campo nombre es obligatorio' });
  }
  if (typeof categoria_id !== 'string') {
    return res.status(400).json({ error: 'categoria_id es obligatorio' });
  }
  if (typeof valor !== 'string' || !valor.trim()) {
    return res.status(400).json({ error: 'valor es obligatorio (el texto a buscar)' });
  }
  if (!CAMPOS_VALIDOS.includes(campo_objetivo)) {
    return res.status(400).json({ error: `campo_objetivo debe ser uno de: ${CAMPOS_VALIDOS.join(', ')}` });
  }
  if (!OPERADORES_VALIDOS.includes(operador)) {
    return res.status(400).json({ error: `operador debe ser uno de: ${OPERADORES_VALIDOS.join(', ')}` });
  }

  const prioridadNum = prioridad === undefined ? 100 : Number(prioridad);
  if (Number.isNaN(prioridadNum) || prioridadNum < 0) {
    return res.status(400).json({ error: 'prioridad debe ser un número mayor o igual a 0' });
  }

  const { data, error } = await req.supabase
    .from('reglas_categorizacion')
    .insert({
      usuario_id: req.usuario.id,
      nombre: nombre.trim(),
      categoria_id,
      valor: valor.trim(),
      campo_objetivo,
      operador,
      prioridad: prioridadNum,
      // origen siempre 'manual' para reglas creadas desde este endpoint —
      // 'learned' queda reservado para una futura fase de IA que no existe todavía.
      origen: 'manual',
    })
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: 'Error al crear la regla', detalle: error.message });
  }

  res.status(201).json({ regla: data });
}

export async function actualizarRegla(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body ?? {};

  if ('usuario_id' in body || 'origen' in body || 'veces_aplicada' in body) {
    return res.status(400).json({
      error: 'usuario_id, origen y veces_aplicada no se pueden modificar desde este endpoint',
    });
  }
  if ('campo_objetivo' in body && !CAMPOS_VALIDOS.includes(body.campo_objetivo)) {
    return res.status(400).json({ error: `campo_objetivo debe ser uno de: ${CAMPOS_VALIDOS.join(', ')}` });
  }
  if ('operador' in body && !OPERADORES_VALIDOS.includes(body.operador)) {
    return res.status(400).json({ error: `operador debe ser uno de: ${OPERADORES_VALIDOS.join(', ')}` });
  }
  if ('prioridad' in body) {
    const p = Number(body.prioridad);
    if (Number.isNaN(p) || p < 0) {
      return res.status(400).json({ error: 'prioridad debe ser un número mayor o igual a 0' });
    }
  }

  const { data, error } = await req.supabase
    .from('reglas_categorizacion')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Regla no encontrada' });
    }
    return res.status(400).json({ error: 'Error al actualizar la regla', detalle: error.message });
  }

  res.json({ regla: data });
}

export async function eliminarRegla(req: Request, res: Response) {
  const { id } = req.params;

  const { error } = await req.supabase.from('reglas_categorizacion').delete().eq('id', id);

  if (error) {
    return res.status(500).json({ error: 'Error al eliminar la regla', detalle: error.message });
  }

  res.status(204).send();
}

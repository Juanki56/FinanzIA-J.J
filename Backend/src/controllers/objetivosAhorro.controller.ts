import type { Request, Response } from 'express';

const ESTADOS_VALIDOS = ['active', 'completed', 'paused', 'cancelled'];

export async function listarObjetivos(req: Request, res: Response) {
  const soloActivos = req.query.solo_activos !== 'false';

  let query = req.supabase.from('objetivos_ahorro').select('*').order('prioridad', { ascending: true });

  if (soloActivos) {
    query = query.eq('activo', true);
  }

  const { data: objetivos, error } = await query;

  if (error) {
    return res.status(500).json({ error: 'Error al consultar los objetivos' });
  }

  const conAsignado = await Promise.all(
    (objetivos ?? []).map(async (o) => {
      const { data: asignaciones } = await req.supabase
        .from('asignaciones_objetivo')
        .select('monto_asignado')
        .eq('objetivo_id', o.id);

      const monto_asignado = (asignaciones ?? []).reduce((suma, a) => suma + Number(a.monto_asignado), 0);

      return { ...o, monto_asignado, faltante: Number(o.monto_objetivo) - monto_asignado };
    })
  );

  res.json({ objetivos: conAsignado });
}

export async function crearObjetivo(req: Request, res: Response) {
  const { nombre, descripcion, monto_objetivo, fecha_objetivo, prioridad } = req.body ?? {};

  if (typeof nombre !== 'string' || !nombre.trim()) {
    return res.status(400).json({ error: 'El campo nombre es obligatorio' });
  }

  const montoNum = Number(monto_objetivo);
  if (!monto_objetivo || Number.isNaN(montoNum) || montoNum <= 0) {
    return res.status(400).json({ error: 'monto_objetivo debe ser un número mayor a 0' });
  }

  if (prioridad !== undefined) {
    const p = Number(prioridad);
    if (Number.isNaN(p) || p < 1 || p > 5) {
      return res.status(400).json({ error: 'prioridad debe estar entre 1 y 5' });
    }
  }

  const nuevoObjetivo: Record<string, unknown> = {
    usuario_id: req.usuario.id,
    nombre: nombre.trim(),
    monto_objetivo: montoNum,
  };

  if (descripcion !== undefined) nuevoObjetivo.descripcion = descripcion;
  if (fecha_objetivo !== undefined) nuevoObjetivo.fecha_objetivo = fecha_objetivo;
  if (prioridad !== undefined) nuevoObjetivo.prioridad = prioridad;

  const { data, error } = await req.supabase
    .from('objetivos_ahorro')
    .insert(nuevoObjetivo)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: 'Error al crear el objetivo', detalle: error.message });
  }

  res.status(201).json({ objetivo: data });
}

export async function actualizarObjetivo(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body ?? {};

  if ('usuario_id' in body) {
    return res.status(400).json({ error: 'usuario_id no se puede modificar' });
  }

  if ('estado' in body && !ESTADOS_VALIDOS.includes(body.estado)) {
    return res.status(400).json({ error: `estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}` });
  }

  const { data, error } = await req.supabase
    .from('objetivos_ahorro')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Objetivo no encontrado' });
    }
    return res.status(400).json({ error: 'Error al actualizar el objetivo', detalle: error.message });
  }

  res.json({ objetivo: data });
}

export async function eliminarObjetivo(req: Request, res: Response) {
  const { id } = req.params;

  const { error } = await req.supabase.from('objetivos_ahorro').delete().eq('id', id);

  if (error) {
    return res.status(500).json({ error: 'Error al eliminar el objetivo', detalle: error.message });
  }

  res.status(204).send();
}

// --- Asignaciones (anidadas bajo un objetivo) ---

export async function listarAsignaciones(req: Request, res: Response) {
  const { id } = req.params;

  const { data, error } = await req.supabase
    .from('asignaciones_objetivo')
    .select('*')
    .eq('objetivo_id', id);

  if (error) {
    return res.status(500).json({ error: 'Error al consultar las asignaciones' });
  }

  res.json({ asignaciones: data });
}

export async function crearAsignacion(req: Request, res: Response) {
  const { id } = req.params; // objetivo_id
  const { cuenta_id, monto_asignado, notas } = req.body ?? {};

  if (typeof cuenta_id !== 'string') {
    return res.status(400).json({ error: 'cuenta_id es obligatorio' });
  }

  const montoNum = Number(monto_asignado);
  if (monto_asignado === undefined || Number.isNaN(montoNum) || montoNum < 0) {
    return res.status(400).json({ error: 'monto_asignado debe ser un número mayor o igual a 0' });
  }

  const nuevaAsignacion: Record<string, unknown> = {
    usuario_id: req.usuario.id,
    objetivo_id: id,
    cuenta_id,
    monto_asignado: montoNum,
  };

  if (notas !== undefined) nuevaAsignacion.notas = notas;

  const { data, error } = await req.supabase
    .from('asignaciones_objetivo')
    .insert(nuevaAsignacion)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: 'Error al crear la asignación', detalle: error.message });
  }

  res.status(201).json({ asignacion: data });
}

export async function eliminarAsignacion(req: Request, res: Response) {
  const { asignacionId } = req.params;

  const { error } = await req.supabase.from('asignaciones_objetivo').delete().eq('id', asignacionId);

  if (error) {
    return res.status(500).json({ error: 'Error al eliminar la asignación', detalle: error.message });
  }

  res.status(204).send();
}
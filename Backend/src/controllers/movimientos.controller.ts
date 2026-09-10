import type { Request, Response } from 'express';

const TIPOS_VALIDOS = ['income', 'expense', 'adjustment'];
const ESTADOS_VALIDOS = ['pending', 'confirmed', 'cancelled'];

export async function listarMovimientos(req: Request, res: Response) {
  const incluirEliminados = req.query.incluir_eliminados === 'true';
  const limite = Math.min(Number(req.query.limite) || 50, 200);
  const pagina = Math.max(Number(req.query.pagina) || 1, 1);
  const desde = (pagina - 1) * limite;
  const hasta = desde + limite - 1;

  let query = req.supabase
    .from('movimientos')
    .select('*', { count: 'exact' })
    .order('fecha_movimiento', { ascending: false })
    .range(desde, hasta);

  if (!incluirEliminados) {
    query = query.eq('eliminado', false);
  }

  const { data, error, count } = await query;

  if (error) {
    return res.status(500).json({ error: 'Error al consultar los movimientos' });
  }

  res.json({
    movimientos: data,
    paginacion: { pagina, limite, total: count ?? 0, total_paginas: Math.ceil((count ?? 0) / limite) },
  });
}

export async function crearMovimiento(req: Request, res: Response) {
  const {
    cuenta_id, categoria_id, tipo, monto, signo,
    descripcion, comercio, fecha_movimiento, estado,
  } = req.body ?? {};

  if (typeof cuenta_id !== 'string') {
    return res.status(400).json({ error: 'cuenta_id es obligatorio' });
  }

  if (typeof tipo !== 'string' || !TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({
      error: `tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}. Para transferencias usa POST /api/transferencias.`,
    });
  }

  const montoNum = Number(monto);
  if (!monto || Number.isNaN(montoNum) || montoNum <= 0) {
    return res.status(400).json({ error: 'monto debe ser un número mayor a 0' });
  }

  if (tipo === 'adjustment') {
    if (signo !== 1 && signo !== -1) {
      return res.status(400).json({ error: "Para tipo 'adjustment', signo es obligatorio y debe ser 1 o -1" });
    }
  } else if (signo !== undefined && signo !== null) {
    return res.status(400).json({ error: `signo solo aplica para tipo 'adjustment', no para '${tipo}'` });
  }

  const estadoFinal = estado === undefined ? 'confirmed' : estado;
  if (!ESTADOS_VALIDOS.includes(estadoFinal)) {
    return res.status(400).json({ error: `estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}` });
  }

  const nuevoMovimiento: Record<string, unknown> = {
    usuario_id: req.usuario.id,
    cuenta_id,
    tipo,
    monto: montoNum,
    estado: estadoFinal,
  };

  if (categoria_id !== undefined) nuevoMovimiento.categoria_id = categoria_id;
  if (tipo === 'adjustment') nuevoMovimiento.signo = signo;
  if (descripcion !== undefined) nuevoMovimiento.descripcion = descripcion;
  if (comercio !== undefined) nuevoMovimiento.comercio = comercio;
  if (fecha_movimiento !== undefined) nuevoMovimiento.fecha_movimiento = fecha_movimiento;

  const { data, error } = await req.supabase
    .from('movimientos')
    .insert(nuevoMovimiento)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: 'Error al crear el movimiento', detalle: error.message });
  }

  res.status(201).json({ movimiento: data });
}

export async function actualizarMovimiento(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body ?? {};

  if ('usuario_id' in body || 'transferencia_id' in body || 'eliminado' in body || 'deleted_at' in body) {
    return res.status(400).json({
      error: 'usuario_id, transferencia_id, eliminado y deleted_at no se pueden modificar desde este endpoint',
    });
  }

  if ('tipo' in body && body.tipo === 'transfer') {
    return res.status(400).json({ error: "No se puede cambiar un movimiento a tipo 'transfer' manualmente" });
  }

  if ('estado' in body && !ESTADOS_VALIDOS.includes(body.estado)) {
    return res.status(400).json({ error: `estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}` });
  }

  const { data, error } = await req.supabase
    .from('movimientos')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }
    return res.status(500).json({ error: 'Error al actualizar el movimiento', detalle: error.message });
  }

  res.json({ movimiento: data });
}

export async function eliminarMovimiento(req: Request, res: Response) {
  const { id } = req.params;

  const { data, error } = await req.supabase
    .from('movimientos')
    .update({ eliminado: true, deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }
    return res.status(500).json({ error: 'Error al eliminar el movimiento', detalle: error.message });
  }

  res.json({ movimiento: data });
}
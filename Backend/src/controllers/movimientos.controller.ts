import type { Request, Response } from 'express';
import { sugerirCategoriaMovimiento } from '../services/categorizacionIA.service.js';
import { GeminiLimiteExcedidoError, GeminiNoConfiguradoError } from '../lib/gemini.js';
import { descripcionGmf, PREFIJO_DESCRIPCION_GMF, TASA_GMF } from '../services/sincronizacion.service.js';

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

  // Rango opcional sobre fecha_movimiento: `desde` inclusivo, `hasta` exclusivo,
  // ambos timestamps ISO. El frontend los arma en hora local (ver utils/date).
  for (const param of ['desde', 'hasta'] as const) {
    const valor = req.query[param];
    if (valor === undefined) continue;
    if (typeof valor !== 'string' || Number.isNaN(Date.parse(valor))) {
      return res.status(400).json({ error: `${param} debe ser una fecha ISO válida` });
    }
    query = param === 'desde' ? query.gte('fecha_movimiento', valor) : query.lt('fecha_movimiento', valor);
  }

  // Filtros opcionales por igualdad. Se aplican aquí (no en el frontend) para
  // que la paginación cuente solo los resultados filtrados.
  for (const campo of ['cuenta_id', 'categoria_id', 'tipo'] as const) {
    const valor = req.query[campo];
    if (valor === undefined || valor === '') continue;
    if (typeof valor !== 'string') {
      return res.status(400).json({ error: `${campo} debe ser un único valor` });
    }
    if (campo === 'tipo' && ![...TIPOS_VALIDOS, 'transfer'].includes(valor)) {
      return res.status(400).json({ error: `tipo debe ser uno de: ${[...TIPOS_VALIDOS, 'transfer'].join(', ')}` });
    }
    query = query.eq(campo, valor);
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
    descripcion, comercio, fecha_movimiento, estado, fuente_movimiento_id,
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
  // Registrado a mano desde un correo que el parser no reconoció (bandeja de
  // "correos sin reconocer"): el movimiento queda enlazado a su correo.
  if (typeof fuente_movimiento_id === 'string') nuevoMovimiento.fuente_movimiento_id = fuente_movimiento_id;

  const { data, error } = await req.supabase
    .from('movimientos')
    .insert(nuevoMovimiento)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: 'Error al crear el movimiento', detalle: error.message });
  }

  if (typeof fuente_movimiento_id === 'string') {
    // Si esto falla el movimiento ya existe igual; el correo solo seguiría
    // en la bandeja, así que no se le devuelve error al usuario.
    const { error: errorFuente } = await req.supabase
      .from('fuentes_movimiento')
      .update({ estado_procesamiento: 'processed' })
      .eq('id', fuente_movimiento_id);
    if (errorFuente) {
      console.error(`[movimientos] no se pudo marcar la fuente ${fuente_movimiento_id} como procesada:`, errorFuente.message);
    }
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

  const cambios: Record<string, unknown> = { ...body };
  // Confirmar o cancelar es justamente revisarlo: sin esto, requiere_revision
  // de los movimientos que llegan por correo se quedaba en true para siempre.
  if ('estado' in body && body.estado !== 'pending') {
    cambios.requiere_revision = false;
  }

  const { data, error } = await req.supabase
    .from('movimientos')
    .update(cambios)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }
    return res.status(500).json({ error: 'Error al actualizar el movimiento', detalle: error.message });
  }

  if ('estado' in body) {
    await propagarACobros(req, data, { estado: body.estado });
  }
  if ('monto' in body) {
    await recalcularGmf(req, data);
  }

  res.json({ movimiento: data });
}

/**
 * Si cambia el monto de un gasto que llegó por correo, su 4x1000 (creado por
 * la sincronización) se recalcula sobre el monto nuevo más la comisión, igual
 * que al crearlo. Sin esto quedaba calculado sobre el monto viejo.
 */
async function recalcularGmf(
  req: Request,
  movimiento: { id: string; tipo: string; monto: number | string; origen: string; fuente_movimiento_id: string | null }
) {
  if (movimiento.origen === 'system' || movimiento.tipo !== 'expense' || !movimiento.fuente_movimiento_id) return;

  const { data: cobros, error } = await req.supabase
    .from('movimientos')
    .select('id, monto, descripcion')
    .eq('fuente_movimiento_id', movimiento.fuente_movimiento_id)
    .eq('origen', 'system')
    .eq('eliminado', false)
    .neq('id', movimiento.id);

  const gmf = cobros?.find((c) => c.descripcion.startsWith(PREFIJO_DESCRIPCION_GMF));
  if (error || !cobros || !gmf) return;

  const comision = cobros.filter((c) => c.id !== gmf.id).reduce((suma, c) => suma + Number(c.monto), 0);
  const base = Number(movimiento.monto) + comision;
  const nuevoGmf = Math.round(base * TASA_GMF);
  // monto > 0 es obligatorio en la base; un gasto tan pequeño que no paga
  // 4x1000 deja el cobro como estaba.
  if (nuevoGmf <= 0) return;

  const { error: errorGmf } = await req.supabase
    .from('movimientos')
    .update({ monto: nuevoGmf, descripcion: descripcionGmf(base) })
    .eq('id', gmf.id);
  if (errorGmf) {
    console.error(`[movimientos] no se pudo recalcular el 4x1000 del movimiento ${movimiento.id}:`, errorGmf.message);
  }
}

/**
 * Los cobros bancarios (comisión, 4x1000) que la sincronización crea junto con
 * un movimiento comparten su correo de origen y llevan origen 'system'. Siguen
 * al movimiento principal: si lo confirmas, cancelas o eliminas, a ellos les
 * pasa lo mismo — si no, el saldo quedaría a medias.
 */
async function propagarACobros(
  req: Request,
  movimiento: { id: string; origen: string; fuente_movimiento_id: string | null },
  cambios: Record<string, unknown>
) {
  if (movimiento.origen === 'system' || !movimiento.fuente_movimiento_id) return;

  const { error } = await req.supabase
    .from('movimientos')
    .update(cambios)
    .eq('fuente_movimiento_id', movimiento.fuente_movimiento_id)
    .eq('origen', 'system')
    .eq('eliminado', false)
    .neq('id', movimiento.id);

  if (error) {
    console.error(`[movimientos] no se pudieron actualizar los cobros del movimiento ${movimiento.id}:`, error.message);
  }
}

/** POST /api/movimientos/:id/sugerir-categoria — pide a Gemini una sugerencia
 * de categoria_id para UN movimiento que todavía no tiene categoría. Nunca
 * escribe movimientos.categoria_id directamente; el usuario confirma con un
 * PATCH normal si la acepta. */
export async function sugerirCategoria(req: Request, res: Response) {
  const { id } = req.params;

  const { data: movimiento, error: errorMovimiento } = await req.supabase
    .from('movimientos')
    .select('id, comercio, descripcion, tipo, monto, categoria_id')
    .eq('id', id)
    .maybeSingle();

  if (errorMovimiento || !movimiento) {
    return res.status(404).json({ error: 'Movimiento no encontrado' });
  }

  if (movimiento.categoria_id) {
    return res.status(400).json({
      error: 'Este movimiento ya tiene categoría. Usa PATCH /api/movimientos/:id si quieres cambiarla.',
    });
  }

  const { data: categorias, error: errorCategorias } = await req.supabase
    .from('categorias')
    .select('id, nombre')
    .eq('activa', true);

  if (errorCategorias) {
    return res.status(500).json({ error: 'Error al consultar las categorías del usuario' });
  }

  if (!categorias || categorias.length === 0) {
    return res.status(400).json({ error: 'No tienes categorías activas todavía — crea al menos una antes de pedir una sugerencia.' });
  }

  try {
    const sugerencia = await sugerirCategoriaMovimiento(req.supabase, movimiento, categorias);
    res.json(sugerencia);
  } catch (err) {
    if (err instanceof GeminiNoConfiguradoError) {
      return res.status(503).json({ error: err.message });
    }
    if (err instanceof GeminiLimiteExcedidoError) {
      if (err.retryAfterSeconds) res.set('Retry-After', String(err.retryAfterSeconds));
      return res.status(429).json({
        error: 'Se alcanzó el límite de peticiones gratuitas de Gemini por ahora. Intenta de nuevo más tarde.',
        retry_after: err.retryAfterSeconds,
      });
    }
    return res.status(503).json({ error: 'No se pudo obtener una sugerencia de categoría en este momento.' });
  }
}

/** GET /api/movimientos/:id/procesamientos-ia — historial de sugerencias de
 * IA para un movimiento, para que el usuario entienda por qué se sugirió algo. */
export async function listarProcesamientosIA(req: Request, res: Response) {
  const { id } = req.params;

  // Confirmamos primero que el movimiento existe y es del usuario (RLS ya lo
  // filtraría, pero así devolvemos 404 en vez de una lista vacía ambigua).
  const { data: movimiento } = await req.supabase.from('movimientos').select('id').eq('id', id).maybeSingle();
  if (!movimiento) {
    return res.status(404).json({ error: 'Movimiento no encontrado' });
  }

  const { data, error } = await req.supabase
    .from('procesamientos_ia')
    .select('*')
    .eq('movimiento_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: 'Error al consultar el historial de IA' });
  }

  res.json({ procesamientos: data });
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

  await propagarACobros(req, data, { eliminado: true, deleted_at: data.deleted_at });

  res.json({ movimiento: data });
}
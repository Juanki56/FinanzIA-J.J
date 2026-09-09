import type { Request, Response } from 'express';

const TIPOS_VALIDOS = ['income', 'expense'];
const FRECUENCIAS_VALIDAS = ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'];

function validarCamposDeFrecuencia(frecuencia: string, dia_del_mes?: number, dia_de_la_semana?: number) {
  if ((frecuencia === 'weekly' || frecuencia === 'biweekly') && dia_de_la_semana === undefined) {
    return 'dia_de_la_semana es obligatorio para frecuencia weekly/biweekly';
  }
  if (frecuencia === 'monthly' && dia_del_mes === undefined) {
    return 'dia_del_mes es obligatorio para frecuencia monthly';
  }
  return null;
}

export async function listarRecurrentes(req: Request, res: Response) {
  const soloActivas = req.query.solo_activas !== 'false';

  let query = req.supabase.from('transacciones_recurrentes').select('*').order('proxima_fecha', { ascending: true });

  if (soloActivas) {
    query = query.eq('activa', true);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: 'Error al consultar las transacciones recurrentes' });
  }

  res.json({ recurrentes: data });
}

export async function crearRecurrente(req: Request, res: Response) {
  const {
    cuenta_id, categoria_id, nombre, descripcion, tipo, monto_estimado,
    frecuencia, intervalo, dia_del_mes, dia_de_la_semana,
    fecha_inicio, fecha_fin, tolerancia_monto,
  } = req.body ?? {};

  if (typeof cuenta_id !== 'string') {
    return res.status(400).json({ error: 'cuenta_id es obligatorio' });
  }

  if (typeof nombre !== 'string' || !nombre.trim()) {
    return res.status(400).json({ error: 'El campo nombre es obligatorio' });
  }

  if (typeof tipo !== 'string' || !TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ error: `tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}` });
  }

  const montoNum = Number(monto_estimado);
  if (!monto_estimado || Number.isNaN(montoNum) || montoNum <= 0) {
    return res.status(400).json({ error: 'monto_estimado debe ser un número mayor a 0' });
  }

  if (typeof frecuencia !== 'string' || !FRECUENCIAS_VALIDAS.includes(frecuencia)) {
    return res.status(400).json({ error: `frecuencia debe ser una de: ${FRECUENCIAS_VALIDAS.join(', ')}` });
  }

  const errorFrecuencia = validarCamposDeFrecuencia(frecuencia, dia_del_mes, dia_de_la_semana);
  if (errorFrecuencia) {
    return res.status(400).json({ error: errorFrecuencia });
  }

  if (typeof fecha_inicio !== 'string') {
    return res.status(400).json({ error: 'fecha_inicio es obligatoria (formato YYYY-MM-DD)' });
  }

  const nuevaRecurrente: Record<string, unknown> = {
    usuario_id: req.usuario.id,
    cuenta_id,
    nombre: nombre.trim(),
    tipo,
    monto_estimado: montoNum,
    frecuencia,
    fecha_inicio,
    proxima_fecha: fecha_inicio,
  };

  if (categoria_id !== undefined) nuevaRecurrente.categoria_id = categoria_id;
  if (descripcion !== undefined) nuevaRecurrente.descripcion = descripcion;
  if (intervalo !== undefined) nuevaRecurrente.intervalo = intervalo;
  if (dia_del_mes !== undefined) nuevaRecurrente.dia_del_mes = dia_del_mes;
  if (dia_de_la_semana !== undefined) nuevaRecurrente.dia_de_la_semana = dia_de_la_semana;
  if (fecha_fin !== undefined) nuevaRecurrente.fecha_fin = fecha_fin;
  if (tolerancia_monto !== undefined) nuevaRecurrente.tolerancia_monto = tolerancia_monto;

  const { data, error } = await req.supabase
    .from('transacciones_recurrentes')
    .insert(nuevaRecurrente)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: 'Error al crear la transacción recurrente', detalle: error.message });
  }

  res.status(201).json({ recurrente: data });
}

export async function actualizarRecurrente(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body ?? {};

  if ('usuario_id' in body) {
    return res.status(400).json({ error: 'usuario_id no se puede modificar' });
  }

  if ('frecuencia' in body && !FRECUENCIAS_VALIDAS.includes(body.frecuencia)) {
    return res.status(400).json({ error: `frecuencia debe ser una de: ${FRECUENCIAS_VALIDAS.join(', ')}` });
  }

  const { data, error } = await req.supabase
    .from('transacciones_recurrentes')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Transacción recurrente no encontrada' });
    }
    return res.status(400).json({ error: 'Error al actualizar', detalle: error.message });
  }

  res.json({ recurrente: data });
}

export async function eliminarRecurrente(req: Request, res: Response) {
  const { id } = req.params;

  const { error } = await req.supabase.from('transacciones_recurrentes').delete().eq('id', id);

  if (error) {
    return res.status(500).json({ error: 'Error al eliminar', detalle: error.message });
  }

  res.status(204).send();
}
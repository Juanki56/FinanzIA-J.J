import type { Request, Response } from 'express';
import { crearTransferenciaAtomica } from '../services/transferencias.service.js';

const ESTADOS_VALIDOS = ['pending', 'completed', 'cancelled'];

export async function listarTransferencias(req: Request, res: Response) {
  const { data, error } = await req.supabase
    .from('transferencias')
    .select('*')
    .order('fecha_transferencia', { ascending: false });

  if (error) {
    return res.status(500).json({ error: 'Error al consultar las transferencias' });
  }

  res.json({ transferencias: data });
}

export async function crearTransferencia(req: Request, res: Response) {
  const { cuenta_origen_id, cuenta_destino_id, monto, descripcion, fecha_transferencia } = req.body ?? {};

  if (typeof cuenta_origen_id !== 'string' || typeof cuenta_destino_id !== 'string') {
    return res.status(400).json({ error: 'cuenta_origen_id y cuenta_destino_id son obligatorios' });
  }

  if (cuenta_origen_id === cuenta_destino_id) {
    return res.status(400).json({ error: 'cuenta_origen_id y cuenta_destino_id deben ser diferentes' });
  }

  const montoNum = Number(monto);
  if (!monto || Number.isNaN(montoNum) || montoNum <= 0) {
    return res.status(400).json({ error: 'monto debe ser un número mayor a 0' });
  }

  const { data, error } = await crearTransferenciaAtomica(req.supabase, {
    cuenta_origen_id, cuenta_destino_id, monto: montoNum, descripcion, fecha_transferencia,
  });

  if (error) {
    return res.status(400).json({ error: 'No se pudo crear la transferencia', detalle: error.message });
  }

  const transferencia = Array.isArray(data) ? data[0] : data;
  res.status(201).json({ transferencia });
}

export async function actualizarEstadoTransferencia(req: Request, res: Response) {
  const { id } = req.params;
  const { estado } = req.body ?? {};

  if (!ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ error: `estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}` });
  }

  const { data, error } = await req.supabase
    .from('transferencias')
    .update({ estado })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Transferencia no encontrada' });
    }
    return res.status(500).json({ error: 'Error al actualizar el estado', detalle: error.message });
  }

  res.json({ transferencia: data });
}
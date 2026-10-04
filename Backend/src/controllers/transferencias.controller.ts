import type { Request, Response } from 'express';
import { crearTransferenciaAtomica, editarTransferenciaAtomica } from '../services/transferencias.service.js';

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

function validarDatosTransferencia(body: any) {
  const { cuenta_origen_id, cuenta_destino_id, monto, descripcion, fecha_transferencia } = body ?? {};

  if (typeof cuenta_origen_id !== 'string' || typeof cuenta_destino_id !== 'string') {
    return { error: 'cuenta_origen_id y cuenta_destino_id son obligatorios' } as const;
  }

  if (cuenta_origen_id === cuenta_destino_id) {
    return { error: 'cuenta_origen_id y cuenta_destino_id deben ser diferentes' } as const;
  }

  const montoNum = Number(monto);
  if (!monto || Number.isNaN(montoNum) || montoNum <= 0) {
    return { error: 'monto debe ser un número mayor a 0' } as const;
  }

  return {
    datos: {
      cuenta_origen_id,
      cuenta_destino_id,
      monto: montoNum,
      descripcion: typeof descripcion === 'string' ? descripcion : undefined,
      fecha_transferencia: typeof fecha_transferencia === 'string' ? fecha_transferencia : undefined,
    },
  } as const;
}

export async function crearTransferencia(req: Request, res: Response) {
  const validacion = validarDatosTransferencia(req.body);
  if ('error' in validacion) {
    return res.status(400).json({ error: validacion.error });
  }

  const { data, error } = await crearTransferenciaAtomica(req.supabase, validacion.datos);

  if (error) {
    return res.status(400).json({ error: 'No se pudo crear la transferencia', detalle: error.message });
  }

  const transferencia = Array.isArray(data) ? data[0] : data;
  res.status(201).json({ transferencia });
}

export async function editarTransferencia(req: Request, res: Response) {
  const validacion = validarDatosTransferencia(req.body);
  if ('error' in validacion) {
    return res.status(400).json({ error: validacion.error });
  }

  const { data, error } = await editarTransferenciaAtomica(req.supabase, String(req.params.id), validacion.datos);

  if (error) {
    if (error.message.includes('Transferencia no encontrada')) {
      return res.status(404).json({ error: 'Transferencia no encontrada' });
    }
    return res.status(400).json({ error: 'No se pudo editar la transferencia', detalle: error.message });
  }

  const transferencia = Array.isArray(data) ? data[0] : data;
  res.json({ transferencia });
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
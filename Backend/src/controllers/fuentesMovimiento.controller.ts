import type { Request, Response } from 'express';

// Verificado por prueba directa contra el CHECK real de la base de datos —
// son estos 4 valores en inglés, no los que sugería el documento original en español.
const ESTADOS_VALIDOS = ['pending', 'processed', 'ignored', 'error'];

export async function listarFuentes(req: Request, res: Response) {
  const estado = req.query.estado_procesamiento;

  if (estado !== undefined && !ESTADOS_VALIDOS.includes(String(estado))) {
    return res.status(400).json({ error: `estado_procesamiento debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}` });
  }

  let query = req.supabase
    .from('fuentes_movimiento')
    .select('*')
    .order('fecha_recibido', { ascending: false });

  if (estado !== undefined) {
    query = query.eq('estado_procesamiento', String(estado));
  }

  // ?sin_revisar=true deja fuera los que el usuario ya descartó a mano (ver
  // descartarFuente) — es la bandeja de "correos sin reconocer" del frontend.
  if (req.query.sin_revisar === 'true') {
    query = query.or('metadata->>descartado.is.null,metadata->>descartado.neq.true');
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: 'Error al consultar las fuentes de movimiento' });
  }

  res.json({ fuentes: data });
}

/** POST /api/fuentes-movimiento/:id/descartar — el usuario revisó un correo
 * no reconocido y decidió que no es un movimiento (publicidad, aviso de
 * seguridad, etc.). Sigue 'ignored' — el CHECK solo admite 4 estados y
 * ninguno dice "revisado" —, se marca en metadata para sacarlo de la bandeja. */
export async function descartarFuente(req: Request, res: Response) {
  const { id } = req.params;

  const { data: fuente, error: errorFuente } = await req.supabase
    .from('fuentes_movimiento')
    .select('id, metadata')
    .eq('id', id)
    .maybeSingle();

  if (errorFuente || !fuente) {
    return res.status(404).json({ error: 'Correo no encontrado' });
  }

  const { error } = await req.supabase
    .from('fuentes_movimiento')
    .update({ metadata: { ...(fuente.metadata ?? {}), descartado: true } })
    .eq('id', id);

  if (error) {
    return res.status(500).json({ error: 'Error al descartar el correo', detalle: error.message });
  }

  res.status(204).end();
}

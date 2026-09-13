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

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: 'Error al consultar las fuentes de movimiento' });
  }

  res.json({ fuentes: data });
}

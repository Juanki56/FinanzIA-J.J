import type { Request, Response } from 'express';

export function obtenerPerfil(req: Request, res: Response) {
  res.json({ usuario: req.usuario });
}

const CAMPOS_ACTUALIZABLES = ['nombre', 'moneda_principal', 'zona_horaria'] as const;

export async function actualizarPerfil(req: Request, res: Response) {
  const body = req.body ?? {};

  if ('email' in body || 'auth_user_id' in body || 'id' in body) {
    return res.status(400).json({ error: 'email, auth_user_id e id no se pueden modificar desde este endpoint' });
  }

  const cambios: Record<string, unknown> = {};
  for (const campo of CAMPOS_ACTUALIZABLES) {
    if (campo in body) cambios[campo] = body[campo];
  }

  if (Object.keys(cambios).length === 0) {
    return res.status(400).json({ error: 'No se enviaron campos válidos para actualizar' });
  }

  if ('moneda_principal' in cambios && String(cambios.moneda_principal).length !== 3) {
    return res.status(400).json({ error: 'moneda_principal debe tener 3 caracteres (ej. COP, USD)' });
  }

  const { data, error } = await req.supabase
    .from('usuarios')
    .update(cambios)
    .eq('id', req.usuario.id)
    .select('id, nombre, email, moneda_principal, zona_horaria')
    .single();

  if (error) {
    return res.status(400).json({ error: 'Error al actualizar el perfil', detalle: error.message });
  }

  res.json({ usuario: data });
}
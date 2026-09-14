import type { Request, Response } from 'express';
import crypto from 'crypto';
import { crearOAuthClient, GMAIL_SCOPES } from '../lib/google.js';
import { sincronizarConexion } from '../services/sincronizacion.service.js';

const SELECT_CONEXION =
  'id, proveedor, tipo, identificador_externo, estado, scopes, token_expira_at, ultima_sincronizacion_at, cuenta_predeterminada_id, created_at';

/**
 * GET /api/conexiones/google — arma la URL de autorización de Google.
 *
 * A propósito NO guarda nada en el servidor (ni en memoria ni en una tabla):
 * Google redirige de vuelta al FRONTEND (GOOGLE_REDIRECT_URI ahora apunta ahí,
 * no al backend), así que la misma pestaña que inició la conexión es la que
 * la termina — no hay nada que "recordar" entre dos peticiones que podrían
 * caer en instancias de servidor distintas (crítico en un despliegue
 * serverless como Vercel). El `state` es un valor aleatorio que el frontend
 * guarda en sessionStorage y verifica él mismo al volver, como protección
 * CSRF — el backend no necesita saber cuál era.
 */
export function iniciarConexionGoogle(_req: Request, res: Response) {
  const state = crypto.randomBytes(32).toString('hex');

  const oauthClient = crearOAuthClient();
  const url = oauthClient.generateAuthUrl({
    access_type: 'offline', // necesario para recibir refresh_token
    prompt: 'consent',      // fuerza a Google a reenviar refresh_token aunque ya hayas autorizado antes
    scope: GMAIL_SCOPES,
    state,
  });

  res.json({ url, state });
}

/**
 * POST /api/conexiones/google/callback — el FRONTEND llama esto (autenticado
 * con el JWT normal del usuario) después de que Google lo redirige de vuelta
 * con un `code`. Intercambia ese código por tokens y crea la conexión con
 * `req.supabase` (ya atado al usuario que hace la request) — no hace falta
 * ningún estado guardado de la petición anterior.
 */
export async function completarConexionGoogle(req: Request, res: Response) {
  const { code } = req.body ?? {};

  if (typeof code !== 'string' || !code) {
    return res.status(400).json({ error: 'Falta el código de autorización de Google' });
  }

  const oauthClient = crearOAuthClient();

  let tokens;
  try {
    ({ tokens } = await oauthClient.getToken(code));
  } catch (err) {
    return res.status(400).json({
      error: 'Google rechazó el código de autorización (puede haber expirado o ya haberse usado). Intenta conectar de nuevo.',
      detalle: err instanceof Error ? err.message : String(err),
    });
  }

  if (!tokens.access_token || !tokens.refresh_token) {
    return res.status(400).json({
      error: 'Google no devolvió los permisos necesarios. Intenta conectar de nuevo y acepta todos los permisos solicitados.',
    });
  }

  const { error } = await req.supabase.rpc('crear_conexion', {
    p_proveedor: 'google',
    p_tipo: 'email',
    p_identificador_externo: null,
    p_scopes: ['gmail.readonly'],
    p_access_token: tokens.access_token,
    p_refresh_token: tokens.refresh_token,
    p_token_expira_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
  });

  if (error) {
    console.error('Error al guardar la conexión de Google:', error);
    return res.status(400).json({ error: 'No se pudo guardar la conexión', detalle: error.message });
  }

  res.json({ ok: true });
}

export async function listarConexiones(req: Request, res: Response) {
  const { data, error } = await req.supabase.from('conexiones').select(SELECT_CONEXION);

  if (error) {
    return res.status(500).json({ error: 'Error al consultar las conexiones' });
  }

  res.json({ conexiones: data });
}

export async function eliminarConexion(req: Request, res: Response) {
  const { id } = req.params;

  const { error } = await req.supabase.rpc('eliminar_conexion', { p_conexion_id: id });

  if (error) {
    return res.status(400).json({ error: 'Error al eliminar la conexión', detalle: error.message });
  }

  res.status(204).send();
}

/** PATCH /api/conexiones/:id — hoy solo permite configurar la cuenta a la que
 * se atribuyen los movimientos creados automáticamente desde esta conexión. */
export async function actualizarConexion(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body ?? {};

  const camposRecibidos = Object.keys(body);
  const camposNoPermitidos = camposRecibidos.filter((c) => c !== 'cuenta_predeterminada_id');
  if (camposNoPermitidos.length > 0) {
    return res.status(400).json({
      error: `Solo se puede modificar cuenta_predeterminada_id desde este endpoint (recibido también: ${camposNoPermitidos.join(', ')})`,
    });
  }
  if (!('cuenta_predeterminada_id' in body)) {
    return res.status(400).json({ error: 'cuenta_predeterminada_id es obligatorio' });
  }

  const cuentaId = body.cuenta_predeterminada_id;
  if (cuentaId !== null && typeof cuentaId !== 'string') {
    return res.status(400).json({ error: 'cuenta_predeterminada_id debe ser un id de cuenta o null' });
  }

  if (cuentaId !== null) {
    // req.supabase respeta RLS: si la cuenta no es del usuario, esto no la encuentra.
    const { data: cuenta } = await req.supabase.from('cuentas').select('id').eq('id', cuentaId).maybeSingle();
    if (!cuenta) {
      return res.status(400).json({ error: 'La cuenta indicada no existe o no te pertenece' });
    }
  }

  const { data, error } = await req.supabase
    .from('conexiones')
    .update({ cuenta_predeterminada_id: cuentaId })
    .eq('id', id)
    .select(SELECT_CONEXION)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Conexión no encontrada' });
    }
    return res.status(400).json({ error: 'Error al actualizar la conexión', detalle: error.message });
  }

  res.json({ conexion: data });
}

/** POST /api/conexiones/:id/sincronizar — dispara la sincronización de forma
 * síncrona usando el JWT del usuario que hace la request (no toca service_role,
 * eso es solo para el cron). */
export async function sincronizarConexionManual(req: Request, res: Response) {
  const { id } = req.params;

  const { data: conexion, error: errorConexion } = await req.supabase
    .from('conexiones')
    .select('id, estado, cuenta_predeterminada_id, ultima_sincronizacion_at')
    .eq('id', id)
    .maybeSingle();

  if (errorConexion || !conexion) {
    return res.status(404).json({ error: 'Conexión no encontrada' });
  }
  if (conexion.estado !== 'active') {
    return res.status(400).json({ error: `La conexión no está activa (estado actual: ${conexion.estado})` });
  }
  if (!conexion.cuenta_predeterminada_id) {
    return res.status(400).json({
      error:
        'Configura una cuenta predeterminada para esta conexión antes de sincronizar (PATCH /api/conexiones/:id con cuenta_predeterminada_id)',
    });
  }

  const resumen = await sincronizarConexion({
    supabase: req.supabase,
    usuarioId: req.usuario.id,
    conexionId: conexion.id,
    cuentaPredeterminadaId: conexion.cuenta_predeterminada_id as string,
    ultimaSincronizacionAt: conexion.ultima_sincronizacion_at as string | null,
    leerTokens: async () => {
      const { data, error } = await req.supabase.rpc('leer_tokens_conexion', { p_conexion_id: id });
      if (error || !data?.[0]) throw new Error('No se pudieron leer los tokens de la conexión');
      return data[0];
    },
    guardarTokens: async (nuevo) => {
      const { error } = await req.supabase.rpc('actualizar_tokens_conexion', {
        p_conexion_id: id,
        p_access_token: nuevo.access_token,
        ...(nuevo.refresh_token ? { p_refresh_token: nuevo.refresh_token } : {}),
        ...(nuevo.token_expira_at ? { p_token_expira_at: nuevo.token_expira_at } : {}),
      });
      if (error) throw new Error(`No se pudieron guardar los tokens renovados: ${error.message}`);
    },
    actualizarUltimaSincronizacion: async (fechaIso) => {
      await req.supabase.from('conexiones').update({ ultima_sincronizacion_at: fechaIso }).eq('id', id);
    },
  });

  res.json(resumen);
}
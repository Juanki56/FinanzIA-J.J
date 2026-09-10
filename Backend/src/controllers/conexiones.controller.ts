import type { Request, Response } from 'express';
import crypto from 'crypto';
import { crearOAuthClient, GMAIL_SCOPES } from '../lib/google.js';
import { crearClienteConToken } from '../lib/supabase.js';
import { guardarEstado, consumirEstado } from '../lib/oauthStateStore.js';

export function iniciarConexionGoogle(req: Request, res: Response) {
  const authHeader = req.headers.authorization!;
  const jwt = authHeader.slice('Bearer '.length);

  const state = crypto.randomBytes(32).toString('hex');
  guardarEstado(state, jwt, req.usuario.id);

  const oauthClient = crearOAuthClient();
  const url = oauthClient.generateAuthUrl({
    access_type: 'offline', // necesario para recibir refresh_token
    prompt: 'consent',      // fuerza a Google a reenviar refresh_token aunque ya hayas autorizado antes
    scope: GMAIL_SCOPES,
    state,
  });

  res.json({ url });
}

export async function callbackGoogle(req: Request, res: Response) {
  const { code, state, error: errorGoogle } = req.query as Record<string, string>;
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (errorGoogle) {
    return res.redirect(`${FRONTEND_URL}/conexiones?estado=error&motivo=cancelado`);
  }

  if (typeof code !== 'string' || typeof state !== 'string') {
    return res.redirect(`${FRONTEND_URL}/conexiones?estado=error&motivo=parametros_faltantes`);
  }

  const guardado = consumirEstado(state);
  if (!guardado) {
    return res.redirect(`${FRONTEND_URL}/conexiones?estado=error&motivo=state_invalido_o_expirado`);
  }

  const oauthClient = crearOAuthClient();
  const { tokens } = await oauthClient.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    return res.redirect(`${FRONTEND_URL}/conexiones?estado=error&motivo=google_no_devolvio_tokens`);
  }

  const supabase = crearClienteConToken(guardado.jwt);

  const { error } = await supabase.rpc('crear_conexion', {
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
    return res.redirect(`${FRONTEND_URL}/conexiones?estado=error&motivo=no_se_pudo_guardar`);
  }

  res.redirect(`${FRONTEND_URL}/conexiones?estado=exito`);
}

export async function listarConexiones(req: Request, res: Response) {
  const { data, error } = await req.supabase
    .from('conexiones')
    .select('id, proveedor, tipo, identificador_externo, estado, scopes, token_expira_at, ultima_sincronizacion_at, created_at');

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
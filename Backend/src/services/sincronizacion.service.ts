import crypto from 'crypto';
import { google } from 'googleapis';
import type { SupabaseClient } from '@supabase/supabase-js';
import { crearOAuthClient } from '../lib/google.js';
import { parsearCorreoBancolombia, BANCOLOMBIA } from '../parsers/bancolombia.js';
import { buscarCategoriaPorReglas } from './categorizacion.service.js';

// Si nunca se ha sincronizado esta conexión, cuánto atrás mirar la primera vez.
const DIAS_LOOKBACK_PRIMERA_VEZ = 90;

interface TokensConexion {
  access_token: string;
  refresh_token: string;
  token_expira_at: string | null;
}

export interface ContextoSincronizacion {
  /**
   * Cliente de Supabase para leer/escribir `fuentes_movimiento` y `movimientos`.
   * Puede ser el cliente atado al JWT del usuario (endpoint manual, RLS activo)
   * o el cliente de service_role (cron, SIN RLS). Por eso TODA consulta de este
   * archivo que toque estas tablas lleva su propio `.eq('usuario_id', usuarioId)`
   * explícito, sin importar cuál cliente sea — no confiar en que RLS lo cubra.
   */
  supabase: SupabaseClient;
  usuarioId: string;
  conexionId: string;
  /** `conexiones.cuenta_predeterminada_id` — a qué cuenta se atribuyen los movimientos creados. */
  cuentaPredeterminadaId: string;
  ultimaSincronizacionAt: string | null;
  leerTokens: () => Promise<TokensConexion>;
  guardarTokens: (nuevo: { access_token: string; refresh_token?: string; token_expira_at?: string }) => Promise<void>;
  actualizarUltimaSincronizacion: (fechaIso: string) => Promise<void>;
}

export interface ResumenSincronizacion {
  correos_nuevos: number;
  movimientos_creados: number;
  sin_reconocer: number;
}

/**
 * Asegura que el access_token esté vigente, refrescándolo con el refresh_token
 * si hace falta. Devuelve un cliente de Gmail listo para usar. Si el refresco
 * cambia el access_token, lo persiste vía `guardarTokens`.
 */
async function prepararClienteGmail(
  tokens: TokensConexion,
  guardarTokens: ContextoSincronizacion['guardarTokens']
) {
  const oauthClient = crearOAuthClient();
  oauthClient.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.token_expira_at ? new Date(tokens.token_expira_at).getTime() : null,
  });

  // getAccessToken() refresca automáticamente con el refresh_token si el
  // access_token actual ya venció (o está por vencer).
  const { token: accessTokenVigente } = await oauthClient.getAccessToken();

  if (accessTokenVigente && accessTokenVigente !== tokens.access_token) {
    await guardarTokens({
      access_token: accessTokenVigente,
      ...(oauthClient.credentials.expiry_date
        ? { token_expira_at: new Date(oauthClient.credentials.expiry_date).toISOString() }
        : {}),
    });
  }

  return google.gmail({ version: 'v1', auth: oauthClient });
}

function calcularHashContenido(remitente: string, textoNormalizado: string): string {
  return crypto.createHash('sha256').update(`${remitente}|${textoNormalizado}`).digest('hex');
}

interface ParteGmail {
  mimeType?: string | null;
  body?: { data?: string | null } | null;
  parts?: ParteGmail[] | null;
}

/**
 * Busca recursivamente la primera parte text/plain del correo (los correos de
 * Bancolombia son multipart/alternative con text/plain + text/html). Si no
 * hay text/plain, cae a text/html quitándole las etiquetas.
 *
 * IMPORTANTE, encontrado probando contra correos reales (no era lo que
 * asumíamos al escribir las plantillas): el texto de la transacción NO está
 * en el asunto (que siempre es el genérico "Alertas y Notificaciones"), está
 * en el cuerpo. Y el cuerpo en texto plano viene con saltos de línea de
 * wrap-de-párrafo insertados a la mitad de la oración (ej. "Recibiste una\n
 * consignacion por..."), así que hay que colapsar todo el whitespace a un
 * solo espacio antes de correr las plantillas — si no, ningún regex hace match.
 */
function extraerYNormalizarCuerpo(payload: ParteGmail | undefined | null): string {
  if (!payload) return '';

  function buscar(parte: ParteGmail, tipoBuscado: string): string | null {
    if (parte.mimeType === tipoBuscado && parte.body?.data) {
      return Buffer.from(parte.body.data, 'base64').toString('utf-8');
    }
    for (const hija of parte.parts ?? []) {
      const encontrada = buscar(hija, tipoBuscado);
      if (encontrada) return encontrada;
    }
    return null;
  }

  const textoPlano = buscar(payload, 'text/plain');
  const crudo = textoPlano ?? buscar(payload, 'text/html')?.replace(/<[^>]+>/g, ' ') ?? '';

  return crudo.replace(/\s+/g, ' ').trim();
}

export async function sincronizarConexion(ctx: ContextoSincronizacion): Promise<ResumenSincronizacion> {
  const { supabase, usuarioId, conexionId, cuentaPredeterminadaId } = ctx;
  const resumen: ResumenSincronizacion = { correos_nuevos: 0, movimientos_creados: 0, sin_reconocer: 0 };

  // --- 1. Token vigente ---
  const tokens = await ctx.leerTokens();
  const gmail = await prepararClienteGmail(tokens, ctx.guardarTokens);

  // --- 2. Listar correos del banco, solo los que llegaron después de la última sincronización ---
  const despuesUnix = ctx.ultimaSincronizacionAt
    ? Math.floor(new Date(ctx.ultimaSincronizacionAt).getTime() / 1000)
    : Math.floor((Date.now() - DIAS_LOOKBACK_PRIMERA_VEZ * 24 * 60 * 60 * 1000) / 1000);

  // Gmail entiende {from:a from:b} como OR entre remitentes -- un banco
  // puede notificar desde más de un dominio (ver nota en BANCOLOMBIA.remitentes).
  const filtroRemitentes = `{${BANCOLOMBIA.remitentes.map((r) => `from:${r}`).join(' ')}}`;

  const listado = await gmail.users.messages.list({
    userId: 'me',
    q: `${filtroRemitentes} after:${despuesUnix}`,
    maxResults: 50,
  });
  const mensajes = listado.data.messages ?? [];

  // Si guardar el correo crudo falla para AL MENOS uno del lote, no avanzamos
  // el cursor de "última sincronización" — así el próximo intento vuelve a
  // mirar toda la ventana. Es seguro repetirla: el hash ya deduplica los que
  // sí se guardaron bien. Sin esto, un fallo transitorio deja ese correo
  // fuera para siempre (el filtro `after:` de Gmail ya no lo trae).
  let huboErrorGuardandoFuente = false;

  for (const mensaje of mensajes) {
    if (!mensaje.id) continue;

    // format: 'full' trae headers Y el cuerpo (antes pedíamos 'metadata', que
    // solo trae headers — insuficiente porque el texto que necesitamos parsear
    // vive en el cuerpo, no en el asunto).
    const detalle = await gmail.users.messages.get({
      userId: 'me',
      id: mensaje.id,
      format: 'full',
    });

    const headers = detalle.data.payload?.headers ?? [];
    const asunto = headers.find((h) => h.name === 'Subject')?.value ?? '';
    const remitenteReal = headers.find((h) => h.name === 'From')?.value ?? BANCOLOMBIA.remitentes[0] ?? 'desconocido';
    const fechaRecibido = detalle.data.internalDate
      ? new Date(Number(detalle.data.internalDate)).toISOString()
      : new Date().toISOString();

    const textoCuerpo = extraerYNormalizarCuerpo(detalle.data.payload);
    const contenidoHash = calcularHashContenido(remitenteReal, textoCuerpo);

    // --- 3-4. Deduplicar por hash, explícitamente scoped por usuario_id ---
    const { data: existente } = await supabase
      .from('fuentes_movimiento')
      .select('id')
      .eq('usuario_id', usuarioId)
      .eq('contenido_hash', contenidoHash)
      .maybeSingle();

    if (existente) continue; // ya procesado en una sincronización anterior

    // --- 5. Guardar el correo crudo ---
    // tipo: NOT NULL en el esquema real — 'email' para todo lo que llega por
    // Gmail (Bancolombia y, más adelante, Nequi). estado_procesamiento usa un
    // CHECK con estos 4 valores exactos en inglés: pending | processed | ignored | error
    // (verificado por prueba directa — el documento original asumía español,
    // que no es lo que hay en la base de datos real).
    const { data: fuente, error: errorFuente } = await supabase
      .from('fuentes_movimiento')
      .insert({
        usuario_id: usuarioId,
        conexion_id: conexionId,
        tipo: 'email',
        asunto,
        remitente: remitenteReal,
        fecha_recibido: fechaRecibido,
        contenido_hash: contenidoHash,
        // Guardamos el texto normalizado que realmente se usó para el regex —
        // útil para auditar por qué un correo quedó 'ignored' sin tener que
        // volver a Gmail a mirarlo.
        metadata: { texto_normalizado: textoCuerpo },
        estado_procesamiento: 'pending',
      })
      .select('id')
      .single();

    if (errorFuente || !fuente) {
      // No pudimos ni guardar el correo crudo. Lo logueamos (antes esto se
      // tragaba en silencio) y NO contamos este correo como "nuevo" ya que no
      // quedó ningún rastro de que lo vimos — se reintentará en la próxima
      // sincronización porque el hash todavía no quedó registrado.
      console.error(
        `[sincronizacion] no se pudo guardar fuentes_movimiento para usuario ${usuarioId}:`,
        errorFuente?.message
      );
      huboErrorGuardandoFuente = true;
      continue;
    }

    resumen.correos_nuevos++;

    // --- 6. Parsear (regex contra el CUERPO normalizado del correo, no el
    // asunto — el asunto real de Bancolombia siempre es el genérico "Alertas
    // y Notificaciones", confirmado probando contra correos reales) ---
    const parseado = parsearCorreoBancolombia(textoCuerpo);

    if (!parseado) {
      // 6b. No reconocido — no se crea movimiento, queda para revisión manual futura.
      await supabase
        .from('fuentes_movimiento')
        .update({ estado_procesamiento: 'ignored' })
        .eq('id', fuente.id)
        .eq('usuario_id', usuarioId);
      resumen.sin_reconocer++;
      continue;
    }

    // 6a. Reconocido — buscar categoría por reglas y crear el movimiento.
    const categoriaId = await buscarCategoriaPorReglas(supabase, usuarioId, {
      comercio: parseado.comercio,
      descripcion: parseado.descripcion,
      remitente: remitenteReal,
      asunto,
    });

    const { error: errorMovimiento } = await supabase.from('movimientos').insert({
      usuario_id: usuarioId,
      cuenta_id: cuentaPredeterminadaId,
      categoria_id: categoriaId,
      tipo: parseado.tipo,
      monto: parseado.monto,
      descripcion: parseado.descripcion,
      comercio: parseado.comercio,
      fecha_movimiento: parseado.fecha_movimiento,
      estado: 'pending',
      origen: 'gmail',
      requiere_revision: true,
      fuente_movimiento_id: fuente.id,
    });

    if (errorMovimiento) {
      // El correo quedó guardado en fuentes_movimiento pero no se pudo crear
      // el movimiento. Antes esto se tragaba en silencio dejando el estado en
      // 'pending' para siempre — ahora queda marcado 'error' explícitamente y
      // logueado, para que sea visible que algo falló y no se pierda.
      console.error(
        `[sincronizacion] no se pudo crear el movimiento para fuente ${fuente.id} (usuario ${usuarioId}):`,
        errorMovimiento.message
      );
      await supabase
        .from('fuentes_movimiento')
        .update({ estado_procesamiento: 'error' })
        .eq('id', fuente.id)
        .eq('usuario_id', usuarioId);
      continue;
    }

    await supabase
      .from('fuentes_movimiento')
      .update({ estado_procesamiento: 'processed' })
      .eq('id', fuente.id)
      .eq('usuario_id', usuarioId);

    resumen.movimientos_creados++;
  }

  if (!huboErrorGuardandoFuente) {
    await ctx.actualizarUltimaSincronizacion(new Date().toISOString());
  }

  return resumen;
}

import crypto from 'crypto';
import { google, type gmail_v1 } from 'googleapis';
import type { SupabaseClient } from '@supabase/supabase-js';
import { crearOAuthClient } from '../lib/google.js';
import { parsearCorreoBancolombia, BANCOLOMBIA } from '../parsers/bancolombia.js';
import type { CorreoParseado } from '../parsers/types.js';
import { buscarCategoriaPorReglas } from './categorizacion.service.js';

// Si nunca se ha sincronizado esta conexión, cuánto atrás mirar la primera vez.
const DIAS_LOOKBACK_PRIMERA_VEZ = 90;

// En sincronizaciones siguientes, cuánto ANTES del cursor volver a mirar.
// Gmail no indexa un correo para búsqueda en el instante en que llega (y el
// banco a veces lo entrega tarde), así que si solo pidiéramos
// `after:<última sincronización>`, un correo que no aparecía en la búsqueda
// en ese momento quedaría fuera para siempre. Repetir la ventana es seguro:
// el hash de contenido ya deduplica lo que se procesó antes.
const DIAS_SOLAPAMIENTO = 3;

const DIA_MS = 24 * 60 * 60 * 1000;

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

// 4x1000: 4 pesos por cada 1.000 que salen de una cuenta no exenta.
const TASA_GMF = 0.004;

interface CobrosCuenta {
  comision_retiro: number;
  cobra_gmf: boolean;
}

/**
 * Lee cuánto cobra el banco en la cuenta destino por cosas que NUNCA llegan
 * por correo. Si falla (ej. la migración de estas columnas todavía no se
 * aplicó) se sigue sin cobros: mejor sincronizar sin ellos que no sincronizar.
 */
async function leerCobrosCuenta(supabase: SupabaseClient, usuarioId: string, cuentaId: string): Promise<CobrosCuenta> {
  const { data, error } = await supabase
    .from('cuentas')
    .select('comision_retiro, cobra_gmf')
    .eq('id', cuentaId)
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (error || !data) {
    console.error(`[sincronizacion] no se pudieron leer los cobros de la cuenta ${cuentaId}:`, error?.message);
    return { comision_retiro: 0, cobra_gmf: false };
  }
  return { comision_retiro: Number(data.comision_retiro), cobra_gmf: data.cobra_gmf };
}

/**
 * Los cobros que el banco descuenta junto con un movimiento sin avisar: la
 * comisión del retiro y el 4x1000 sobre todo lo que sale (incluida esa misma
 * comisión, que también es una salida). Van como movimientos aparte — así el
 * gasto original conserva su categoría real — con origen 'system' y el mismo
 * correo de origen, que es como se reconocen al confirmar o eliminar el
 * movimiento principal (ver movimientos.controller).
 */
function calcularCobros(parseado: CorreoParseado, cobros: CobrosCuenta): { monto: number; descripcion: string }[] {
  if (parseado.tipo !== 'expense') return [];
  const resultado: { monto: number; descripcion: string }[] = [];

  const comision = parseado.es_retiro ? cobros.comision_retiro : 0;
  if (comision > 0) {
    resultado.push({ monto: comision, descripcion: 'Comisión por retiro de efectivo (cobro del plan de la cuenta)' });
  }

  if (cobros.cobra_gmf) {
    const base = parseado.monto + comision;
    const gmf = Math.round(base * TASA_GMF);
    if (gmf > 0) resultado.push({ monto: gmf, descripcion: `Impuesto 4x1000 (GMF) sobre $${base.toLocaleString('es-CO')}` });
  }

  return resultado;
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
  const cobros = await leerCobrosCuenta(supabase, usuarioId, cuentaPredeterminadaId);

  // --- 1. Token vigente ---
  const tokens = await ctx.leerTokens();
  const gmail = await prepararClienteGmail(tokens, ctx.guardarTokens);

  // --- 2. Listar correos del banco, solo los que llegaron después de la última sincronización ---
  // El cursor se toma al INICIO de la corrida, no al final: un correo que
  // llegue mientras procesamos el lote debe quedar dentro de la próxima ventana.
  const inicioCorrida = new Date().toISOString();
  const despuesMs = ctx.ultimaSincronizacionAt
    ? new Date(ctx.ultimaSincronizacionAt).getTime() - DIAS_SOLAPAMIENTO * DIA_MS
    : Date.now() - DIAS_LOOKBACK_PRIMERA_VEZ * DIA_MS;
  const despuesUnix = Math.floor(despuesMs / 1000);

  // Gmail entiende {from:a from:b} como OR entre remitentes -- un banco
  // puede notificar desde más de un dominio (ver nota en BANCOLOMBIA.remitentes).
  const filtroRemitentes = `{${BANCOLOMBIA.remitentes.map((r) => `from:${r}`).join(' ')}}`;

  // Paginamos: con solo la primera página, lo que pasara de maxResults
  // quedaba fuera de la ventana sin que nadie lo volviera a pedir.
  const mensajes: { id?: string | null }[] = [];
  let pageToken: string | undefined;
  do {
    const params: gmail_v1.Params$Resource$Users$Messages$List = {
      userId: 'me',
      q: `${filtroRemitentes} after:${despuesUnix}`,
      maxResults: 100,
      ...(pageToken ? { pageToken } : {}),
    };
    const listado = await gmail.users.messages.list(params);
    mensajes.push(...(listado.data.messages ?? []));
    pageToken = listado.data.nextPageToken ?? undefined;
  } while (pageToken);

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

    // 6c. Cobros del banco que no llegan por correo (comisión, 4x1000). Si
    // fallan el movimiento principal ya quedó; solo se loguea.
    const cobrosMovimiento = calcularCobros(parseado, cobros);
    if (cobrosMovimiento.length > 0) {
      const { error: errorCobros } = await supabase.from('movimientos').insert(
        cobrosMovimiento.map((cobro) => ({
          usuario_id: usuarioId,
          cuenta_id: cuentaPredeterminadaId,
          tipo: 'expense',
          monto: cobro.monto,
          descripcion: cobro.descripcion,
          comercio: 'Bancolombia',
          fecha_movimiento: parseado.fecha_movimiento,
          estado: 'pending',
          origen: 'system',
          creado_por_usuario: false,
          fuente_movimiento_id: fuente.id,
        }))
      );
      if (errorCobros) {
        console.error(`[sincronizacion] no se pudieron crear los cobros bancarios de la fuente ${fuente.id}:`, errorCobros.message);
      }
    }

    await supabase
      .from('fuentes_movimiento')
      .update({ estado_procesamiento: 'processed' })
      .eq('id', fuente.id)
      .eq('usuario_id', usuarioId);

    resumen.movimientos_creados++;
  }

  if (!huboErrorGuardandoFuente) {
    await ctx.actualizarUltimaSincronizacion(inicioCorrida);
  }

  return resumen;
}

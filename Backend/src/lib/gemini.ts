// Cliente mínimo para la API de Gemini (nivel gratuito). Lo usan dos casos de
// uso separados, que solo comparten este archivo:
// - services/categorizacionIA.service.ts: sugerir categoria_id de un movimiento.
// - services/asistenteIA.service.ts: explicar en lenguaje natural un resultado
//   que el simulador financiero YA calculó (la IA no calcula nada).
//
// ADVERTENCIA DE PRIVACIDAD (documentada aquí Y en el prompt original):
// en el nivel gratuito de la API de Gemini, Google puede usar el contenido
// enviado para mejorar sus propios modelos — confirmado directamente en su
// tabla de precios (https://ai.google.dev/gemini-api/docs/pricing), fila
// "Used to improve our products: Yes" para el nivel gratuito de
// gemini-3.5-flash-lite. El usuario decidió explícitamente no pagar y aceptar
// esa condición. La mitigación real es la minimización de datos: nunca se
// envía nada que identifique al usuario ni el correo crudo. La categorización
// manda solo rangos de monto; el asistente manda la pregunta del usuario,
// cifras ya calculadas (totales, plazos), nombres de categorías y objetivos, y
// los nombres de las cuentas usadas en esa simulación. Nunca la lista
// completa de cuentas, comercios, ids ni tokens.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

// Sin esto una petición colgada dejaba el endpoint esperando para siempre.
const TIMEOUT_MS = 20_000;

export class GeminiNoConfiguradoError extends Error {
  constructor() {
    super('Falta GEMINI_API_KEY en el .env — necesaria para las funciones con IA.');
    this.name = 'GeminiNoConfiguradoError';
  }
}

export class GeminiLimiteExcedidoError extends Error {
  retryAfterSeconds: number | null;
  constructor(retryAfterSeconds: number | null) {
    super('Se alcanzó el límite de peticiones gratuitas de Gemini.');
    this.name = 'GeminiLimiteExcedidoError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface RespuestaGemini {
  categoria_id: string | null;
  confianza: number;
}

/**
 * Llamada genérica: manda un prompt y devuelve el texto de la respuesta, el
 * JSON crudo y el modelo usado. `json: true` pide respuesta en JSON.
 *
 * NO reintenta automáticamente en caso de 429 — el proyecto usa un nivel
 * gratuito con cuota limitada, y reintentar sin límite empeoraría el problema.
 * El caller decide qué hacer con GeminiLimiteExcedidoError.
 */
export async function llamarGemini(
  prompt: string,
  opciones: { json?: boolean } = {}
): Promise<{ texto: string; crudo: unknown; modelo: string }> {
  if (!GEMINI_API_KEY) {
    throw new GeminiNoConfiguradoError();
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      ...(opciones.json ? { generationConfig: { responseMimeType: 'application/json' } } : {}),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const body = await res.json();

  if (res.status === 429) {
    const retryInfo = body?.error?.details?.find(
      (d: { '@type'?: string }) => d['@type']?.includes('RetryInfo')
    );
    const retryDelay: string | undefined = retryInfo?.retryDelay; // ej. "35s"
    const retryAfterSeconds = retryDelay ? Number(retryDelay.replace('s', '')) || null : null;
    throw new GeminiLimiteExcedidoError(retryAfterSeconds);
  }

  if (!res.ok) {
    throw new Error(`Gemini respondió ${res.status}: ${body?.error?.message ?? 'error desconocido'}`);
  }

  const textoRespuesta = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof textoRespuesta !== 'string') {
    throw new Error('Gemini no devolvió el texto esperado en la respuesta');
  }

  return { texto: textoRespuesta, crudo: body, modelo: GEMINI_MODEL };
}

/**
 * Sugerencia de categoría: el prompt ya trae el payload minimizado embebido.
 * Devuelve la sugerencia parseada Y el JSON crudo de la respuesta (para
 * guardar en procesamientos_ia.resultado tal cual, sin reinterpretarlo).
 */
export async function sugerirCategoriaConGemini(
  prompt: string
): Promise<{ sugerencia: RespuestaGemini; crudo: unknown; modelo: string }> {
  const { texto: textoRespuesta, crudo, modelo } = await llamarGemini(prompt, { json: true });

  let sugerencia: RespuestaGemini;
  try {
    const parseado = JSON.parse(textoRespuesta);
    sugerencia = {
      categoria_id: typeof parseado.categoria_id === 'string' ? parseado.categoria_id : null,
      confianza: typeof parseado.confianza === 'number' ? parseado.confianza : 0,
    };
  } catch {
    // Gemini no devolvió JSON válido pese a responseMimeType — tratamos como
    // "sin sugerencia útil" en vez de reventar el endpoint.
    sugerencia = { categoria_id: null, confianza: 0 };
  }

  return { sugerencia, crudo, modelo };
}

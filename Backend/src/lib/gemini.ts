// Cliente mínimo para la API de Gemini (nivel gratuito), usado únicamente
// para sugerir categoria_id de movimientos ya existentes — ver
// services/categorizacionIA.service.ts para el flujo completo y la
// minimización de datos.
//
// ADVERTENCIA DE PRIVACIDAD (documentada aquí Y en el prompt original):
// en el nivel gratuito de la API de Gemini, Google puede usar el contenido
// enviado para mejorar sus propios modelos — confirmado directamente en su
// tabla de precios (https://ai.google.dev/gemini-api/docs/pricing), fila
// "Used to improve our products: Yes" para el nivel gratuito de
// gemini-3.5-flash-lite. El usuario decidió explícitamente no pagar y aceptar
// esa condición. La mitigación real es la minimización de datos: nunca se
// envía nada que identifique al usuario, ni montos exactos, ni el correo crudo.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

export class GeminiNoConfiguradoError extends Error {
  constructor() {
    super('Falta GEMINI_API_KEY en el .env — necesaria para sugerir categorías con IA.');
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
 * Llama a Gemini con un prompt que ya trae el payload minimizado embebido.
 * Devuelve la sugerencia parseada Y el JSON crudo de la respuesta (para
 * guardar en procesamientos_ia.resultado tal cual, sin reinterpretarlo).
 *
 * NO reintenta automáticamente en caso de 429 — el proyecto usa un nivel
 * gratuito con cuota limitada, y reintentar sin límite empeoraría el problema.
 * El caller decide qué hacer con GeminiLimiteExcedidoError.
 */
export async function sugerirCategoriaConGemini(
  prompt: string
): Promise<{ sugerencia: RespuestaGemini; crudo: unknown; modelo: string }> {
  if (!GEMINI_API_KEY) {
    throw new GeminiNoConfiguradoError();
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
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

  return { sugerencia, crudo: body, modelo: GEMINI_MODEL };
}

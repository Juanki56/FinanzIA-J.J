import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sugerirCategoriaConGemini, GeminiLimiteExcedidoError, GeminiNoConfiguradoError } from '../lib/gemini.js';

interface MovimientoParaSugerir {
  id: string;
  comercio: string | null;
  descripcion: string | null;
  tipo: string;
  monto: number;
}

interface CategoriaDisponible {
  id: string;
  nombre: string;
}

/**
 * Rangos simples en vez del monto exacto — reduce la exposición de datos
 * financieros precisos hacia un tercero. Para elegir "Comida" vs "Servicios"
 * no hace falta saber si fue $448.300 o $448.301.
 */
function calcularRangoMonto(monto: number): string {
  if (monto < 50000) return '<50000';
  if (monto < 200000) return '50000-200000';
  if (monto < 1000000) return '200000-1000000';
  return '>1000000';
}

function construirPrompt(payload: object, categorias: CategoriaDisponible[]): string {
  return [
    `Tienes esta lista de categorías disponibles: ${JSON.stringify(categorias)}`,
    `Dado este movimiento financiero: ${JSON.stringify(payload)}`,
    '¿Cuál de las categorías de la lista es la más adecuada? Responde ÚNICAMENTE con el "id" de la categoría elegida, en JSON: {"categoria_id": "...", "confianza": 0.0-1.0}',
    'Si ninguna categoría encaja razonablemente, responde {"categoria_id": null, "confianza": 0}',
  ].join('\n');
}

export interface ResultadoSugerencia {
  categoria_id: string | null;
  confianza: number;
}

/**
 * Sugiere una categoría para un movimiento vía Gemini y SIEMPRE deja un
 * registro en procesamientos_ia (exista o no una sugerencia útil) — es el
 * rastro auditable de qué se le preguntó a la IA y qué respondió.
 *
 * `supabase` debe ser el cliente atado al JWT del usuario (requireAuth) —
 * este flujo no necesita ni debe usar service_role, RLS ya protege
 * `procesamientos_ia` porque la propiedad se deriva de movimiento_id.
 *
 * Nunca escribe `movimientos.categoria_id` directamente — el usuario decide
 * con un PATCH normal si acepta la sugerencia.
 */
export async function sugerirCategoriaMovimiento(
  supabase: SupabaseClient,
  movimiento: MovimientoParaSugerir,
  categorias: CategoriaDisponible[]
): Promise<ResultadoSugerencia> {
  // Payload minimizado — SOLO estos 4 campos salen hacia Gemini. Nunca el
  // correo crudo, nunca nombre/email/cuenta del usuario, nunca el monto exacto.
  const payloadMinimizado = {
    comercio: movimiento.comercio,
    descripcion: movimiento.descripcion,
    tipo: movimiento.tipo,
    monto_rango: calcularRangoMonto(movimiento.monto),
  };

  const entradaHash = crypto.createHash('sha256').update(JSON.stringify(payloadMinimizado)).digest('hex');
  const prompt = construirPrompt(payloadMinimizado, categorias);

  let sugerencia: ResultadoSugerencia = { categoria_id: null, confianza: 0 };
  let resultadoCrudo: unknown = {};
  let modelo = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  try {
    const respuesta = await sugerirCategoriaConGemini(prompt);
    sugerencia = respuesta.sugerencia;
    resultadoCrudo = respuesta.crudo;
    modelo = respuesta.modelo;
  } catch (err) {
    if (err instanceof GeminiLimiteExcedidoError || err instanceof GeminiNoConfiguradoError) {
      // Ninguno de los dos llegó a intentar de verdad una llamada a Gemini
      // (falta la key, o ya se sabe que la cuota está agotada) — no hay
      // "resultado" real que auditar, así que no guardamos procesamientos_ia
      // para no ensuciar el historial con intentos fantasma. El controller
      // decide cómo responder (503 / 429).
      throw err;
    }
    // Cualquier otro error (Gemini caído, JSON inesperado, etc.): sí dejamos
    // rastro en procesamientos_ia con el error, para que quede visible que se
    // intentó y falló, no que simplemente nunca se ejecutó.
    resultadoCrudo = { error: err instanceof Error ? err.message : String(err) };
  }

  // Nunca confiar ciegamente en el id que devuelve el modelo — si "alucina"
  // un id que no está en la lista real de categorías del usuario, lo
  // descartamos en vez de dejarlo pasar a procesamientos_ia.categoria_sugerida_id.
  const categoriaValida = categorias.some((c) => c.id === sugerencia.categoria_id) ? sugerencia.categoria_id : null;

  await supabase.from('procesamientos_ia').insert({
    movimiento_id: movimiento.id,
    proveedor: 'google',
    modelo,
    tipo_procesamiento: 'categorization',
    entrada_hash: entradaHash,
    resultado: resultadoCrudo,
    confianza: sugerencia.confianza,
    categoria_sugerida_id: categoriaValida,
    comercio_detectado: movimiento.comercio,
    // SIEMPRE true — la IA nunca asigna la categoría directamente, esto es
    // constante por diseño, no una decisión que dependa del resultado.
    requiere_revision: true,
  });

  return { categoria_id: categoriaValida, confianza: sugerencia.confianza };
}

import type { Request, Response } from 'express';
import { ejecutarHerramienta, validarParametros } from '../services/herramientasAsistente.service.js';
import {
  ExplicacionDescartadaError,
  explicarResultado,
  interpretarPregunta,
  type ResultadoHerramienta,
  type TurnoPrevio,
} from '../services/asistenteIA.service.js';
import { GeminiLimiteExcedidoError, GeminiNoConfiguradoError } from '../lib/gemini.js';

// Asistente / Simulador financiero. SOLO LECTURA: ningún endpoint de aquí crea
// movimientos ni toca saldos. FinanzIA calcula (herramientasAsistente →
// simulacionFinanciera); la IA solo interpreta la pregunta y explica el
// resultado. Si la explicación falla, igual se devuelve el cálculo.

const MAX_LARGO_PREGUNTA = 500;
const MAX_TURNOS = 3;

const RESPUESTA_FUERA_DE_ALCANCE =
  'Por ahora puedo ayudarte a simular un gasto (de tus ahorros, de una cuenta o de todo lo que tienes) y cuánto tardarías en recuperarlo, proyectar cuándo alcanzas tus objetivos, y resumir tus finanzas: saldos, ingresos y gastos por mes y en qué categorías gastas más.';

function mensajeErrorIA(err: unknown): string {
  if (err instanceof GeminiNoConfiguradoError) return 'La IA no está configurada en este servidor.';
  if (err instanceof GeminiLimiteExcedidoError) return 'Se alcanzó el límite gratuito de la IA por ahora. Intenta de nuevo en un rato.';
  if (err instanceof ExplicacionDescartadaError) {
    return 'La explicación de la IA traía cifras que FinanzIA no calculó, así que se descartó. Los números de arriba sí son correctos.';
  }
  return 'No se pudo generar la explicación en este momento.';
}

async function explicarSinFallar(pregunta: string, historial: TurnoPrevio[], resultado: ResultadoHerramienta) {
  try {
    return { explicacion: await explicarResultado(pregunta, historial, resultado), explicacion_error: null };
  } catch (err) {
    console.error('[asistente] no se pudo explicar el resultado:', err instanceof Error ? err.message : err);
    return { explicacion: null, explicacion_error: mensajeErrorIA(err) };
  }
}

function leerHistorial(valor: unknown): TurnoPrevio[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .filter((t): t is TurnoPrevio => typeof t?.pregunta === 'string' && typeof t?.respuesta === 'string')
    .slice(-MAX_TURNOS);
}

/**
 * POST /api/asistente/preguntas — { pregunta, historial? }. Pregunta libre:
 * la IA elige el cálculo y sus parámetros, el backend los valida y calcula,
 * y la IA explica el resultado. Si falta un dato o una cuenta no existe, se
 * responde con una aclaración en vez de calcular con datos inventados.
 */
export async function responderPregunta(req: Request, res: Response) {
  const pregunta = typeof req.body?.pregunta === 'string' ? req.body.pregunta.trim() : '';
  if (!pregunta) return res.status(400).json({ error: 'Escribe una pregunta' });
  if (pregunta.length > MAX_LARGO_PREGUNTA) {
    return res.status(400).json({ error: `La pregunta puede tener máximo ${MAX_LARGO_PREGUNTA} caracteres` });
  }
  const historial = leerHistorial(req.body?.historial);

  let interpretacion;
  try {
    interpretacion = await interpretarPregunta(pregunta, historial);
  } catch (err) {
    console.error('[asistente] no se pudo interpretar la pregunta:', err instanceof Error ? err.message : err);
    const status = err instanceof GeminiLimiteExcedidoError ? 429 : 503;
    return res.status(status).json({ error: `${mensajeErrorIA(err)} Mientras tanto puedes usar el formulario de simulación.` });
  }

  const { herramienta, parametros } = interpretacion;
  const sinCalculo = (aclaracion: string) =>
    res.json({ herramienta, parametros, aclaracion, resultado: null, explicacion: null, explicacion_error: null });

  if (herramienta === 'fuera_de_alcance') return sinCalculo(RESPUESTA_FUERA_DE_ALCANCE);

  const validacion = validarParametros(herramienta, parametros);
  if (!validacion.ok) return sinCalculo(interpretacion.falta ?? validacion.mensaje);

  const ejecucion = await ejecutarHerramienta(req.supabase, herramienta, validacion.parametros);
  if (!ejecucion.ok) return sinCalculo(ejecucion.mensaje);

  const { explicacion, explicacion_error } = await explicarSinFallar(pregunta, historial, ejecucion.resultado);
  res.json({ herramienta, parametros, aclaracion: null, resultado: ejecucion.resultado, explicacion, explicacion_error });
}

/**
 * POST /api/asistente/simulaciones/gasto — { monto, plazo_meses?, ahorro_mensual?, cuenta_ids? }.
 * El mismo cálculo que la pregunta libre, pero desde el formulario (sin el
 * paso de interpretación: los parámetros ya vienen estructurados).
 */
export async function simularGastoFormulario(req: Request, res: Response) {
  const validacion = validarParametros('simular_gasto', req.body ?? {});
  if (!validacion.ok) return res.status(400).json({ error: validacion.mensaje });

  const ejecucion = await ejecutarHerramienta(req.supabase, 'simular_gasto', validacion.parametros);
  if (!ejecucion.ok) return res.status(400).json({ error: ejecucion.mensaje });

  const pregunta = `¿Qué pasa si gasto $${Number(validacion.parametros.monto).toLocaleString('es-CO')}?`;
  const { explicacion, explicacion_error } = await explicarSinFallar(pregunta, [], ejecucion.resultado);
  res.json({ simulacion: ejecucion.resultado, explicacion, explicacion_error });
}

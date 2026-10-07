import { llamarGemini } from '../lib/gemini.js';
import type {
  CodigoAdvertencia,
  ResultadoGasto,
  ResultadoProyeccionObjetivos,
  ResultadoResumenFinanciero,
} from './simulacionFinanciera.js';

// IA del asistente financiero. Separada a propósito de la IA de
// categorización (categorizacionIA.service.ts): solo comparten lib/gemini.ts.
//
// Dos pasos, y en ninguno la IA calcula:
// 1. interpretarPregunta: entiende la pregunta libre y elige QUÉ cálculo hace
//    falta y con qué parámetros. El backend los valida antes de usarlos.
// 2. explicarResultado: convierte en lenguaje natural un resultado que el
//    simulador YA calculó. verificarCifras() descarta la explicación si trae
//    una cifra que FinanzIA no calculó.

export type Herramienta = 'simular_gasto' | 'proyeccion_objetivos' | 'resumen_financiero' | 'fuera_de_alcance';
export type ResultadoHerramienta = ResultadoGasto | ResultadoProyeccionObjetivos | ResultadoResumenFinanciero;

export interface TurnoPrevio {
  pregunta: string;
  respuesta: string;
}

export interface Interpretacion {
  herramienta: Herramienta;
  parametros: {
    monto: number | null;
    plazo_meses: number | null;
    ahorro_mensual: number | null;
    /** Cuentas tal como las nombró el usuario ("bancolombia"); el backend las busca. */
    cuentas: string[];
    todas_las_cuentas: boolean;
  };
  /** Pregunta de aclaración si falta un dato obligatorio (ej. el monto). */
  falta: string | null;
}

export class ExplicacionDescartadaError extends Error {
  constructor(cifras: string[]) {
    super(`La explicación incluía cifras que no salen del cálculo: ${cifras.join(', ')}`);
    this.name = 'ExplicacionDescartadaError';
  }
}

const HERRAMIENTAS_VALIDAS: Herramienta[] = ['simular_gasto', 'proyeccion_objetivos', 'resumen_financiero', 'fuera_de_alcance'];
const MAX_TURNOS_PREVIOS = 3;
const MAX_LARGO_TURNO = 500;

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function pesos(valor: number): string {
  const signo = valor < 0 ? '-' : '';
  return `${signo}$${Math.abs(Math.round(valor)).toLocaleString('es-CO')}`;
}

function decimal(valor: number): string {
  return String(valor).replace('.', ',');
}

function fechaLarga(fechaIso: string): string {
  const [anio, mes, dia] = fechaIso.split('-').map(Number) as [number, number, number];
  return `${dia} de ${MESES[mes - 1]} de ${anio}`;
}

function nombreMes(mes: string): string {
  const [anio, m] = mes.split('-').map(Number) as [number, number];
  return `${MESES[m - 1]} ${anio}`;
}

const TEXTO_ADVERTENCIA: Record<CodigoAdvertencia, string> = {
  sin_fondos: 'Las cuentas elegidas no tienen saldo.',
  ritmo_sin_datos: 'No hay suficientes meses completos confirmados para saber cuánto ahorra al mes, ni el usuario lo indicó: no se pueden estimar plazos.',
  ritmo_no_positivo: 'Su ahorro mensual es cero o negativo: con ese ritmo no avanzaría.',
  gasto_supera_saldo: 'El gasto es mayor que todo el saldo de las cuentas elegidas.',
  toca_objetivos: 'El gasto usaría dinero que tiene reservado para sus objetivos de ahorro.',
  objetivo_vencido: 'Tiene al menos un objetivo cuya fecha ya pasó sin completarse.',
  sin_objetivos: 'No tiene objetivos de ahorro activos.',
  hay_pendientes: 'Tiene movimientos pendientes de confirmar que no cuentan en estas cifras, así que pueden estar incompletas.',
};

function origenRitmo(r: ResultadoGasto['ritmo']): string {
  if (r.fuente === 'usuario') return 'lo indicó el usuario';
  if (r.fuente === 'calculado') return `promedio de sus últimos ${r.meses_usados} meses confirmados`;
  return 'desconocido';
}

// --- Paso 1: interpretar la pregunta ---------------------------------------

function textoHistorial(historial: TurnoPrevio[]): string {
  if (historial.length === 0) return '(sin conversación previa)';
  return historial
    .map((t) => `Usuario: ${t.pregunta.slice(0, MAX_LARGO_TURNO)}\nFinanzIA: ${t.respuesta.slice(0, MAX_LARGO_TURNO)}`)
    .join('\n');
}

function construirPromptInterpretacion(pregunta: string, historial: TurnoPrevio[]): string {
  return [
    'Eres el clasificador del asistente financiero de FinanzIA (app de finanzas personales en Colombia, pesos COP).',
    'NO respondas la pregunta. Solo decide qué cálculo debe hacer FinanzIA y extrae los parámetros.',
    '',
    'Cálculos disponibles:',
    '- "simular_gasto": qué pasa si gasta cierto dinero (de sus ahorros, de una cuenta concreta, de varias o de todo lo que tiene), cuánto tarda en recuperarlo, cuánto ahorrar para recuperarlo en un plazo. Parámetros: monto (obligatorio), plazo_meses (opcional), ahorro_mensual (opcional, si dice cuánto ahorra al mes), cuentas (lista con los nombres de cuentas que mencione, escritos como los dijo, ej. ["bancolombia"]; vacía si no menciona ninguna), todas_las_cuentas (true si dice "de todo lo que tengo", "de todas mis cuentas" o similar).',
    '- "proyeccion_objetivos": cuándo alcanza sus objetivos/metas de ahorro, cuánto ahorrar al mes para llegar a tiempo. Parámetros: ahorro_mensual (opcional).',
    '- "resumen_financiero": preguntas generales sobre sus finanzas: cuánto tiene, cuánto gana o gasta, en qué gasta más, cómo va el mes, si está ahorrando, comparar meses. Sin parámetros.',
    '- "fuera_de_alcance": cualquier cosa que no sea sobre sus finanzas personales registradas en la app (inversiones, consejos de productos, temas no financieros).',
    '',
    'Reglas:',
    '- Convierte montos escritos a número: "400 mil" = 400000, "1,5 millones" = 1500000, "$200.000" = 200000.',
    '- No inventes parámetros. Si falta un dato obligatorio, ponlo en null y escribe en "falta" una pregunta corta para pedirlo.',
    '- Usa la conversación previa para entender preguntas de seguimiento (ej. "¿y si fueran 6 meses?" reutiliza el monto y las cuentas anteriores; "de Nequi" responde a "¿de cuál cuenta?").',
    '- "Mis ahorros" sin nombrar una cuenta NO es una cuenta: deja cuentas vacía.',
    '',
    'Conversación previa:',
    textoHistorial(historial),
    '',
    `Pregunta actual: ${pregunta}`,
    '',
    'Responde SOLO con JSON: {"herramienta": "...", "parametros": {"monto": number|null, "plazo_meses": number|null, "ahorro_mensual": number|null, "cuentas": string[], "todas_las_cuentas": boolean}, "falta": string|null}',
  ].join('\n');
}

const numeroONull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export async function interpretarPregunta(pregunta: string, historial: TurnoPrevio[]): Promise<Interpretacion> {
  const { texto } = await llamarGemini(construirPromptInterpretacion(pregunta, historial.slice(-MAX_TURNOS_PREVIOS)), { json: true });

  let crudo: Record<string, unknown> = {};
  try {
    crudo = JSON.parse(texto) as Record<string, unknown>;
  } catch {
    // Sin JSON válido no sabemos qué quiso: lo tratamos como no entendido.
  }
  const parametros = (crudo.parametros ?? {}) as Record<string, unknown>;
  const herramienta = HERRAMIENTAS_VALIDAS.includes(crudo.herramienta as Herramienta)
    ? (crudo.herramienta as Herramienta)
    : 'fuera_de_alcance';

  return {
    herramienta,
    parametros: {
      monto: numeroONull(parametros.monto),
      plazo_meses: numeroONull(parametros.plazo_meses),
      ahorro_mensual: numeroONull(parametros.ahorro_mensual),
      cuentas: Array.isArray(parametros.cuentas)
        ? parametros.cuentas.filter((c): c is string => typeof c === 'string' && c.trim() !== '').slice(0, 5)
        : [],
      todas_las_cuentas: parametros.todas_las_cuentas === true,
    },
    falta: typeof crudo.falta === 'string' && crudo.falta.trim() ? crudo.falta.trim() : null,
  };
}

// --- Paso 2: explicar un resultado ya calculado ----------------------------

/** Solo hechos ya calculados y formateados: es TODO lo que la IA puede usar. */
function construirHechos(r: ResultadoHerramienta): Record<string, unknown> {
  const comunes = {
    advertencias: r.advertencias.map((a) => TEXTO_ADVERTENCIA[a]),
    supuestos: r.supuestos,
  };

  if (r.tipo === 'gasto') {
    return {
      gasto_simulado: pesos(r.parametros.monto),
      // Nombres de las cuentas usadas en ESTA simulación (las que el usuario
      // nombró o, si no nombró ninguna, sus cuentas de ahorro): no se manda la
      // lista completa de cuentas ni ids.
      dinero_sale_de:
        r.fondos.origen === 'todas'
          ? `todo su dinero disponible (${r.fondos.cuentas.map((c) => c.nombre).join(', ')})`
          : r.fondos.origen === 'ahorro'
            ? `sus cuentas de ahorro (${r.fondos.cuentas.map((c) => c.nombre).join(', ')})`
            : r.fondos.cuentas.map((c) => c.nombre).join(', '),
      saldo_actual_de_esas_cuentas: pesos(r.fondos.actual),
      saldo_despues_del_gasto: pesos(r.fondos.despues),
      porcentaje_del_saldo_que_representa: r.fondos.porcentaje_que_representa === null ? null : `${decimal(r.fondos.porcentaje_que_representa)}%`,
      faltante_si_no_alcanza: r.fondos.alcanza ? null : pesos(r.fondos.faltante),
      ahorro_mensual_usado: r.ritmo.valor === null ? null : pesos(r.ritmo.valor),
      origen_del_ahorro_mensual: origenRitmo(r.ritmo),
      recuperacion_al_ritmo_actual: r.recuperacion
        ? { meses: decimal(r.recuperacion.meses), dias: r.recuperacion.dias, fecha_estimada: fechaLarga(r.recuperacion.fecha_estimada) }
        : null,
      recuperacion_en_plazo_pedido: r.recuperacion_en_plazo
        ? {
            plazo_meses: r.recuperacion_en_plazo.plazo_meses,
            ahorro_adicional_por_mes: pesos(r.recuperacion_en_plazo.adicional_mensual),
            ahorro_mensual_total_requerido:
              r.recuperacion_en_plazo.mensual_requerido === null ? null : pesos(r.recuperacion_en_plazo.mensual_requerido),
          }
        : null,
      objetivos: {
        dinero_reservado_para_objetivos_en_esas_cuentas: pesos(r.objetivos.asignado_en_cuentas),
        el_gasto_toca_dinero_reservado: r.objetivos.toca_objetivos,
        monto_reservado_que_tocaria: r.objetivos.toca_objetivos ? pesos(r.objetivos.monto_que_toca) : null,
        lista: r.objetivos.lista.map((o) => ({
          nombre: o.nombre,
          meta: pesos(o.monto_objetivo),
          reservado: pesos(o.monto_asignado),
          falta: pesos(o.faltante),
          fecha: o.fecha_objetivo ? fechaLarga(o.fecha_objetivo) : null,
          fecha_ya_paso: o.vencido,
        })),
      },
      ...comunes,
    };
  }

  if (r.tipo === 'proyeccion_objetivos') {
    return {
      ahorro_mensual_usado: r.ritmo.valor === null ? null : pesos(r.ritmo.valor),
      origen_del_ahorro_mensual: origenRitmo(r.ritmo),
      objetivos: r.objetivos.map((o) => ({
        nombre: o.nombre,
        meta: pesos(o.monto_objetivo),
        reservado: pesos(o.monto_asignado),
        falta: pesos(o.faltante),
        fecha_objetivo: o.fecha_objetivo ? fechaLarga(o.fecha_objetivo) : null,
        fecha_ya_paso: o.vencido,
        a_tu_ritmo_llegarias_en_meses: o.meses_para_llegar === null ? null : decimal(o.meses_para_llegar),
        a_tu_ritmo_llegarias_el: o.fecha_estimada ? fechaLarga(o.fecha_estimada) : null,
        ahorro_mensual_necesario_para_llegar_a_tiempo: o.necesario_mensual === null ? null : pesos(o.necesario_mensual),
        llega_a_tiempo: o.llega_a_tiempo,
      })),
      ...comunes,
    };
  }

  return {
    saldo_disponible_total: pesos(r.saldos.disponible),
    total_en_cuentas_de_ahorro: pesos(r.saldos.ahorro),
    deudas: pesos(r.saldos.deudas),
    meses: r.meses.map((m) => ({
      mes: nombreMes(m.mes),
      en_curso: m.en_curso,
      ingresos_confirmados: pesos(m.ingresos),
      gastos_confirmados: pesos(m.gastos),
      balance: pesos(m.balance),
      movimientos_pendientes_sin_contar: m.pendientes,
    })),
    categorias_con_mas_gasto_este_mes: r.categorias_mes_actual.map((c) => ({ categoria: c.categoria, gasto: pesos(c.gasto) })),
    categorias_con_mas_gasto_en_el_periodo: r.categorias_periodo.map((c) => ({ categoria: c.categoria, gasto: pesos(c.gasto) })),
    ahorro_mensual_promedio: r.ritmo.valor === null ? null : pesos(r.ritmo.valor),
    origen_del_ahorro_mensual: origenRitmo(r.ritmo),
    objetivos: r.objetivos.map((o) => ({
      nombre: o.nombre,
      meta: pesos(o.monto_objetivo),
      reservado: pesos(o.monto_asignado),
      falta: pesos(o.faltante),
      fecha: o.fecha_objetivo ? fechaLarga(o.fecha_objetivo) : null,
    })),
    ...comunes,
  };
}

function construirPromptExplicacion(pregunta: string, historial: TurnoPrevio[], hechos: Record<string, unknown>): string {
  return [
    'Eres el asistente financiero de FinanzIA, una app de finanzas personales en Colombia.',
    'Conversación previa (solo como contexto):',
    textoHistorial(historial),
    '',
    `El usuario preguntó: "${pregunta}"`,
    'FinanzIA ya hizo todos los cálculos. Estos son los resultados (JSON):',
    JSON.stringify(hechos, null, 2),
    '',
    'Reglas obligatorias:',
    '- Responde la pregunta en español, tuteando, en 3 a 6 frases claras y cálidas. Sin títulos, sin listas, sin markdown.',
    '- Usa SOLO las cifras y fechas de este JSON, copiadas exactamente como aparecen. No hagas cuentas ni escribas ninguna cifra nueva: ni sumas, ni restas, ni promedios, ni porcentajes propios, ni cifras de la conversación previa.',
    '- Si el JSON no tiene lo necesario para responder, dilo con honestidad y explica qué dato falta; no lo inventes.',
    '- Menciona las advertencias que afecten la respuesta.',
    '- Puedes sugerir ajustes (gastar menos en una categoría, confirmar pendientes, marcar una cuenta de ahorro), pero sin cifras que no estén en el JSON.',
    '- No des consejos de inversión ni recomiendes productos financieros.',
  ].join('\n');
}

/** Todas las cifras que el cálculo permite citar (pesos, cantidades y años de las fechas). */
function cifrasPermitidas(resultado: ResultadoHerramienta): Set<number> {
  const permitidas = new Set<number>();
  const recorrer = (valor: unknown) => {
    if (typeof valor === 'number') {
      permitidas.add(Math.round(Math.abs(valor)));
    } else if (typeof valor === 'string' && /^\d{4}-\d{2}(-\d{2})?/.test(valor)) {
      permitidas.add(Number(valor.slice(0, 4)));
    } else if (valor && typeof valor === 'object') {
      Object.values(valor).forEach(recorrer);
    }
  };
  recorrer(resultado);
  return permitidas;
}

/**
 * Toda cifra de 4 o más dígitos en el texto ("$633.333", "2026") tiene que
 * existir en el resultado calculado. Las cifras pequeñas (0,8 meses, 3 meses,
 * 25 días) no se revisan: abundan en texto normal y no se pueden inventar
 * con impacto real en pesos.
 */
export function verificarCifras(texto: string, resultado: ResultadoHerramienta): string[] {
  const permitidas = cifrasPermitidas(resultado);
  const encontradas = texto.match(/\d[\d.]*(?:,\d+)?/g) ?? [];
  return encontradas.filter((cifra) => {
    const entera = cifra.split(',')[0]!.replace(/\./g, '');
    if (entera.length < 4) return false;
    return !permitidas.has(Number(entera));
  });
}

export async function explicarResultado(
  pregunta: string,
  historial: TurnoPrevio[],
  resultado: ResultadoHerramienta
): Promise<{ texto: string; modelo: string }> {
  const prompt = construirPromptExplicacion(pregunta, historial.slice(-MAX_TURNOS_PREVIOS), construirHechos(resultado));
  const { texto, modelo } = await llamarGemini(prompt);
  const limpio = texto.trim();
  const inventadas = verificarCifras(limpio, resultado);
  if (inventadas.length > 0) throw new ExplicacionDescartadaError(inventadas);
  return { texto: limpio, modelo };
}

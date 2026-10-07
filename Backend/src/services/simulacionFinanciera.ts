import type { DatosResumen, Fondos, ObjetivoContexto, RitmoAhorro } from './contextoFinanciero.service.js';

// Motor de simulación financiera: funciones PURAS (sin base de datos, sin IA,
// sin fecha del sistema). Mismos datos de entrada, mismo resultado. Aquí está
// TODA la matemática; la IA solo explica lo que sale de aquí.
// Nada de esto escribe: una simulación nunca crea movimientos ni toca saldos.

export const DIAS_POR_MES = 30.44;

export type CodigoAdvertencia =
  | 'sin_fondos'
  | 'ritmo_sin_datos'
  | 'ritmo_no_positivo'
  | 'gasto_supera_saldo'
  | 'toca_objetivos'
  | 'objetivo_vencido'
  | 'sin_objetivos'
  | 'hay_pendientes';

export interface ContextoSimulacion {
  /** "YYYY-MM-DD" en hora local del usuario. */
  hoy: string;
  /** Las cuentas de donde sale el gasto simulado (una, varias, las de ahorro o todas). */
  fondos: Pick<Fondos, 'cuentas' | 'total' | 'origen'>;
  ritmo: RitmoAhorro;
  /** asignado_en_cuentas se refiere a las cuentas de `fondos`. */
  objetivos: ObjetivoContexto[];
}

export interface ParametrosGasto {
  monto: number;
  plazoMeses?: number | null;
  /** Si el usuario lo escribe, manda sobre el calculado. */
  ahorroMensual?: number | null;
}

export interface ResultadoGasto {
  tipo: 'gasto';
  fecha_calculo: string;
  parametros: { monto: number; plazo_meses: number | null; ahorro_mensual_usuario: number | null };
  fondos: {
    origen: Fondos['origen'];
    cuentas: { nombre: string; saldo: number }[];
    actual: number;
    despues: number;
    porcentaje_que_representa: number | null;
    alcanza: boolean;
    faltante: number;
  };
  ritmo: {
    valor: number | null;
    fuente: 'usuario' | 'calculado' | 'ninguno';
    meses_usados: number;
    /** Lo que FinanzIA calculó con el historial, aunque no se use (para mostrarlo). */
    calculado: number | null;
  };
  recuperacion: { meses: number; dias: number; fecha_estimada: string } | null;
  recuperacion_en_plazo: { plazo_meses: number; adicional_mensual: number; mensual_requerido: number | null } | null;
  objetivos: {
    asignado_en_cuentas: number;
    libre_antes: number;
    toca_objetivos: boolean;
    monto_que_toca: number;
    lista: {
      nombre: string;
      monto_objetivo: number;
      monto_asignado: number;
      faltante: number;
      fecha_objetivo: string | null;
      vencido: boolean;
    }[];
  };
  advertencias: CodigoAdvertencia[];
  supuestos: string[];
}

const redondear = (valor: number) => Math.round(valor);
const unDecimal = (valor: number) => Math.round(valor * 10) / 10;

function sumarDias(fechaIso: string, dias: number): string {
  const [anio, mes, dia] = fechaIso.split('-').map(Number) as [number, number, number];
  const fecha = new Date(Date.UTC(anio, mes - 1, dia + dias));
  return fecha.toISOString().slice(0, 10);
}

/** El ritmo que se usa: el que escribió el usuario, o el calculado si es confiable. */
function resolverRitmo(ritmo: RitmoAhorro, ahorroMensual: number | null) {
  if (ahorroMensual !== null) return { valor: ahorroMensual, fuente: 'usuario' as const };
  if (ritmo.confiable && ritmo.valor !== null) return { valor: ritmo.valor, fuente: 'calculado' as const };
  return { valor: null, fuente: 'ninguno' as const };
}

/**
 * "¿Qué pasa si gasto X de [una cuenta / varias / mis ahorros / todo]?" y
 * "¿cuánto tardo en recuperarlo, o qué ahorro para recuperarlo en N meses?".
 */
export function simularGasto(contexto: ContextoSimulacion, parametros: ParametrosGasto): ResultadoGasto {
  const { monto } = parametros;
  const plazoMeses = parametros.plazoMeses ?? null;
  const ahorroMensualUsuario = parametros.ahorroMensual ?? null;
  const advertencias: CodigoAdvertencia[] = [];

  // --- Saldo antes y después ---
  const actual = contexto.fondos.total;
  const despues = actual - monto;
  const alcanza = monto <= actual;
  if (contexto.fondos.cuentas.length === 0 || actual <= 0) advertencias.push('sin_fondos');
  else if (!alcanza) advertencias.push('gasto_supera_saldo');

  // --- Ritmo de ahorro y recuperación ---
  const ritmo = resolverRitmo(contexto.ritmo, ahorroMensualUsuario);
  let recuperacion: ResultadoGasto['recuperacion'] = null;
  if (ritmo.valor === null) {
    advertencias.push('ritmo_sin_datos');
  } else if (ritmo.valor <= 0) {
    advertencias.push('ritmo_no_positivo');
  } else {
    const meses = monto / ritmo.valor;
    const dias = Math.ceil(meses * DIAS_POR_MES);
    recuperacion = { meses: unDecimal(meses), dias, fecha_estimada: sumarDias(contexto.hoy, dias) };
  }

  // --- Recuperarlo en un plazo fijo ---
  let recuperacionEnPlazo: ResultadoGasto['recuperacion_en_plazo'] = null;
  if (plazoMeses !== null) {
    const adicional = monto / plazoMeses;
    recuperacionEnPlazo = {
      plazo_meses: plazoMeses,
      adicional_mensual: redondear(adicional),
      // Sin ritmo conocido solo se sabe lo adicional, no el total mensual.
      mensual_requerido: ritmo.valor !== null && ritmo.valor > 0 ? redondear(ritmo.valor + adicional) : null,
    };
  }

  // --- Impacto en objetivos ---
  // Las asignaciones son "plata reservada" (notas, no movimientos): el gasto
  // las toca si es mayor a lo que queda libre en esas cuentas.
  const asignadoEnCuentas = contexto.objetivos.reduce((s, o) => s + o.asignado_en_cuentas, 0);
  const libreAntes = actual - asignadoEnCuentas;
  const montoQueToca = Math.max(0, monto - Math.max(libreAntes, 0));
  const tocaObjetivos = montoQueToca > 0 && asignadoEnCuentas > 0;
  if (tocaObjetivos) advertencias.push('toca_objetivos');

  const lista = contexto.objetivos.map((o) => {
    const faltante = Math.max(0, o.monto_objetivo - o.monto_asignado);
    const vencido = o.fecha_objetivo !== null && o.fecha_objetivo < contexto.hoy && faltante > 0;
    return { nombre: o.nombre, monto_objetivo: o.monto_objetivo, monto_asignado: o.monto_asignado, faltante, fecha_objetivo: o.fecha_objetivo, vencido };
  });
  if (lista.some((o) => o.vencido)) advertencias.push('objetivo_vencido');

  const supuestos = [
    `Un mes se cuenta como ${String(DIAS_POR_MES).replace('.', ',')} días.`,
    'Se asume que tu ahorro mensual se mantiene igual en los próximos meses.',
  ];
  if (ritmo.fuente === 'calculado') {
    supuestos.push(`El ahorro mensual es el promedio de tus últimos ${contexto.ritmo.meses_usados} meses completos confirmados.`);
  }

  return {
    tipo: 'gasto',
    fecha_calculo: contexto.hoy,
    parametros: { monto, plazo_meses: plazoMeses, ahorro_mensual_usuario: ahorroMensualUsuario },
    fondos: {
      origen: contexto.fondos.origen,
      cuentas: contexto.fondos.cuentas,
      actual,
      despues,
      porcentaje_que_representa: actual > 0 ? unDecimal((monto / actual) * 100) : null,
      alcanza,
      faltante: alcanza ? 0 : monto - actual,
    },
    ritmo: describirRitmo(ritmo, contexto.ritmo),
    recuperacion,
    recuperacion_en_plazo: recuperacionEnPlazo,
    objetivos: {
      asignado_en_cuentas: asignadoEnCuentas,
      libre_antes: libreAntes,
      toca_objetivos: tocaObjetivos,
      monto_que_toca: asignadoEnCuentas > 0 ? Math.min(montoQueToca, asignadoEnCuentas) : 0,
      lista,
    },
    advertencias,
    supuestos,
  };
}

/** El ritmo usado, su fuente y lo que FinanzIA calculó (aunque no se use), redondeados. */
function describirRitmo(
  ritmo: ReturnType<typeof resolverRitmo>,
  calculado: RitmoAhorro
): ResultadoGasto['ritmo'] {
  return {
    valor: ritmo.valor === null ? null : redondear(ritmo.valor),
    fuente: ritmo.fuente,
    meses_usados: calculado.meses_usados,
    calculado: calculado.valor === null ? null : redondear(calculado.valor),
  };
}

function diasEntre(desdeIso: string, hastaIso: string): number {
  return Math.round((Date.parse(`${hastaIso}T00:00:00Z`) - Date.parse(`${desdeIso}T00:00:00Z`)) / 86_400_000);
}

const TEXTO_DIAS_POR_MES = `Un mes se cuenta como ${String(DIAS_POR_MES).replace('.', ',')} días.`;

export interface ObjetivoProyectado {
  nombre: string;
  monto_objetivo: number;
  monto_asignado: number;
  faltante: number;
  fecha_objetivo: string | null;
  /** A tu ritmo, en cuántos meses llegarías (null sin ritmo positivo). */
  meses_para_llegar: number | null;
  fecha_estimada: string | null;
  /** Cuánto habría que ahorrar al mes para llegar justo en fecha_objetivo. */
  necesario_mensual: number | null;
  llega_a_tiempo: boolean | null;
  vencido: boolean;
}

export interface ResultadoProyeccionObjetivos {
  tipo: 'proyeccion_objetivos';
  fecha_calculo: string;
  parametros: { ahorro_mensual_usuario: number | null };
  ritmo: ResultadoGasto['ritmo'];
  objetivos: ObjetivoProyectado[];
  advertencias: CodigoAdvertencia[];
  supuestos: string[];
}

/** "¿Cuándo alcanzo mi objetivo si ahorro X al mes?" */
export function proyectarObjetivos(
  contexto: Pick<ContextoSimulacion, 'hoy' | 'ritmo' | 'objetivos'>,
  parametros: { ahorroMensual?: number | null }
): ResultadoProyeccionObjetivos {
  const ahorroMensualUsuario = parametros.ahorroMensual ?? null;
  const ritmo = resolverRitmo(contexto.ritmo, ahorroMensualUsuario);
  const advertencias: CodigoAdvertencia[] = [];
  if (contexto.objetivos.length === 0) advertencias.push('sin_objetivos');
  if (ritmo.valor === null) advertencias.push('ritmo_sin_datos');
  else if (ritmo.valor <= 0) advertencias.push('ritmo_no_positivo');

  const objetivos = contexto.objetivos.map((o): ObjetivoProyectado => {
    const faltante = Math.max(0, o.monto_objetivo - o.monto_asignado);
    const vencido = o.fecha_objetivo !== null && o.fecha_objetivo < contexto.hoy && faltante > 0;

    let mesesParaLlegar: number | null = null;
    let fechaEstimada: string | null = null;
    if (faltante === 0) {
      mesesParaLlegar = 0;
      fechaEstimada = contexto.hoy;
    } else if (ritmo.valor !== null && ritmo.valor > 0) {
      const meses = faltante / ritmo.valor;
      mesesParaLlegar = unDecimal(meses);
      fechaEstimada = sumarDias(contexto.hoy, Math.ceil(meses * DIAS_POR_MES));
    }

    let necesarioMensual: number | null = null;
    if (o.fecha_objetivo !== null && !vencido && faltante > 0) {
      const dias = diasEntre(contexto.hoy, o.fecha_objetivo);
      // Con menos de un día de margen no tiene sentido un "por mes".
      if (dias >= 1) necesarioMensual = redondear(faltante / (dias / DIAS_POR_MES));
    }

    return {
      nombre: o.nombre,
      monto_objetivo: o.monto_objetivo,
      monto_asignado: o.monto_asignado,
      faltante,
      fecha_objetivo: o.fecha_objetivo,
      meses_para_llegar: mesesParaLlegar,
      fecha_estimada: fechaEstimada,
      necesario_mensual: necesarioMensual,
      llega_a_tiempo: o.fecha_objetivo !== null && fechaEstimada !== null ? fechaEstimada <= o.fecha_objetivo : null,
      vencido,
    };
  });
  if (objetivos.some((o) => o.vencido)) advertencias.push('objetivo_vencido');

  return {
    tipo: 'proyeccion_objetivos',
    fecha_calculo: contexto.hoy,
    parametros: { ahorro_mensual_usuario: ahorroMensualUsuario },
    ritmo: describirRitmo(ritmo, contexto.ritmo),
    objetivos,
    advertencias,
    supuestos: [
      'Cada objetivo se calcula como si todo tu ahorro mensual fuera para él.',
      'Lo ya reservado son las asignaciones que hiciste en Objetivos.',
      TEXTO_DIAS_POR_MES,
    ],
  };
}

export interface ResultadoResumenFinanciero {
  tipo: 'resumen_financiero';
  fecha_calculo: string;
  saldos: {
    disponible: number;
    ahorro: number;
    deudas: number;
    /** Solo para mostrar en la app: los nombres de cuentas NO se mandan a la IA. */
    cuentas: { nombre: string; saldo: number; es_ahorro: boolean; es_pasivo: boolean }[];
  };
  meses: { mes: string; en_curso: boolean; ingresos: number; gastos: number; balance: number; pendientes: number }[];
  categorias_mes_actual: { categoria: string; gasto: number }[];
  categorias_periodo: { categoria: string; gasto: number }[];
  ritmo: ResultadoGasto['ritmo'];
  objetivos: { nombre: string; monto_objetivo: number; monto_asignado: number; faltante: number; fecha_objetivo: string | null }[];
  advertencias: CodigoAdvertencia[];
  supuestos: string[];
}

const TOP_CATEGORIAS = 5;

function siguienteMes(mes: string): string {
  const [anio, m] = mes.split('-').map(Number) as [number, number];
  return m === 12 ? `${anio + 1}-01` : `${anio}-${String(m + 1).padStart(2, '0')}`;
}

/**
 * Resumen para preguntas generales ("¿en qué gasto más?", "¿voy bien este
 * mes?"). Solo cuenta lo CONFIRMADO, igual que el saldo y los reportes; los
 * pendientes se informan aparte para que se sepa que faltan.
 * `claveMes` convierte un timestamp en "YYYY-MM" en hora local del usuario.
 */
export function resumirFinanzas(
  datos: DatosResumen,
  contexto: Pick<ContextoSimulacion, 'hoy' | 'ritmo' | 'objetivos'>,
  claveMes: (fechaIso: string) => string
): ResultadoResumenFinanciero {
  const saldos = {
    disponible: datos.cuentas.filter((c) => !c.es_pasivo && c.incluir_en_saldo_total).reduce((s, c) => s + c.saldo, 0),
    ahorro: datos.cuentas.filter((c) => c.es_ahorro && !c.es_pasivo).reduce((s, c) => s + c.saldo, 0),
    deudas: datos.cuentas.filter((c) => c.es_pasivo).reduce((s, c) => s + c.saldo, 0),
    cuentas: datos.cuentas.map((c) => ({ nombre: c.nombre, saldo: c.saldo, es_ahorro: c.es_ahorro, es_pasivo: c.es_pasivo })),
  };

  // Todos los meses del periodo, aunque no tengan movimientos.
  const mesActual = contexto.hoy.slice(0, 7);
  const porMes = new Map<string, { ingresos: number; gastos: number; pendientes: number }>();
  for (let mes = claveMes(datos.desde); mes <= mesActual; mes = siguienteMes(mes)) {
    porMes.set(mes, { ingresos: 0, gastos: 0, pendientes: 0 });
  }

  // Gasto por categoría raíz: las subcategorías suman en su padre.
  const porId = new Map(datos.categorias.map((c) => [c.id, c]));
  const nombreRaiz = (id: string | null) => {
    const c = id ? porId.get(id) : undefined;
    if (!c) return 'Sin categoría';
    return (c.categoria_padre_id && porId.get(c.categoria_padre_id)?.nombre) || c.nombre;
  };
  const catMes = new Map<string, number>();
  const catPeriodo = new Map<string, number>();
  let pendientes = 0;

  for (const m of datos.movimientos) {
    const claveMov = claveMes(m.fecha_movimiento);
    const mes = porMes.get(claveMov);
    if (!mes) continue;
    if (m.estado === 'pending') {
      mes.pendientes++;
      pendientes++;
    } else if (m.tipo === 'income') {
      mes.ingresos += m.monto;
    } else {
      mes.gastos += m.monto;
      const nombre = nombreRaiz(m.categoria_id);
      catPeriodo.set(nombre, (catPeriodo.get(nombre) ?? 0) + m.monto);
      if (claveMov === mesActual) catMes.set(nombre, (catMes.get(nombre) ?? 0) + m.monto);
    }
  }

  const top = (mapa: Map<string, number>) =>
    [...mapa.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_CATEGORIAS)
      .map(([categoria, gasto]) => ({ categoria, gasto: redondear(gasto) }));

  return {
    tipo: 'resumen_financiero',
    fecha_calculo: contexto.hoy,
    saldos,
    meses: [...porMes.entries()].map(([mes, v]) => ({
      mes,
      en_curso: mes === mesActual,
      ingresos: redondear(v.ingresos),
      gastos: redondear(v.gastos),
      balance: redondear(v.ingresos - v.gastos),
      pendientes: v.pendientes,
    })),
    categorias_mes_actual: top(catMes),
    categorias_periodo: top(catPeriodo),
    ritmo: describirRitmo(resolverRitmo(contexto.ritmo, null), contexto.ritmo),
    objetivos: contexto.objetivos.map((o) => ({
      nombre: o.nombre,
      monto_objetivo: o.monto_objetivo,
      monto_asignado: o.monto_asignado,
      faltante: Math.max(0, o.monto_objetivo - o.monto_asignado),
      fecha_objetivo: o.fecha_objetivo,
    })),
    advertencias: pendientes > 0 ? ['hay_pendientes'] : [],
    supuestos: ['Solo cuentan ingresos y gastos confirmados; los pendientes no.', 'El mes en curso todavía no ha terminado.'],
  };
}

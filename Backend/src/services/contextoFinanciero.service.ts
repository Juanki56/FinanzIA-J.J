import type { SupabaseClient } from '@supabase/supabase-js';

// Lee y resume los datos reales del usuario que necesita el simulador
// financiero. SOLO LECTURA: nada aquí escribe en la base. Recibe el cliente
// atado al JWT del usuario (RLS activo), igual que el resto de servicios que
// responden a una request.

// Colombia es UTC-5 todo el año (sin horario de verano), como asume el parser
// de Bancolombia. Los meses se cortan en hora local, no en UTC.
const OFFSET_COLOMBIA_HORAS = 5;
const MESES_RITMO = 3;
const MESES_MINIMOS_CONFIABLE = 2;

/** Cuenta de la que se puede simular un gasto: activa y que no es deuda. */
export interface CuentaDisponible {
  id: string;
  nombre: string;
  saldo: number;
  es_ahorro: boolean;
  incluir_en_saldo_total: boolean;
}

/**
 * De dónde sale el dinero del gasto simulado:
 * - 'nombradas': las cuentas que el usuario mencionó o eligió.
 * - 'ahorro': no nombró ninguna → sus cuentas marcadas como ahorro.
 * - 'todas': todo su dinero disponible (lo pidió, o no tiene cuentas de ahorro).
 */
export type OrigenFondos = 'nombradas' | 'ahorro' | 'todas';

export interface Fondos {
  cuentas: { nombre: string; saldo: number }[];
  total: number;
  /** ids de esas cuentas, para cruzar con asignaciones a objetivos. */
  cuentaIds: string[];
  origen: OrigenFondos;
}

export interface MesRitmo {
  mes: string; // "YYYY-MM"
  ingresos: number;
  gastos: number;
  ahorro: number;
  /** false si el mes tiene pendientes o no tiene movimientos confirmados: no entra al promedio. */
  usado: boolean;
}

export interface RitmoAhorro {
  /** Promedio de (ingresos − gastos) confirmados en los meses usados; null si no hay ninguno. */
  valor: number | null;
  meses_usados: number;
  detalle_por_mes: MesRitmo[];
  confiable: boolean;
}

export interface ObjetivoContexto {
  nombre: string;
  monto_objetivo: number;
  monto_asignado: number;
  /** Parte de lo asignado que está en las cuentas de la simulación (la que el gasto puede tocar). */
  asignado_en_cuentas: number;
  fecha_objetivo: string | null;
}

/** Suma lo asignado a un objetivo. La usan listarObjetivos y el simulador. */
export function montoAsignado(asignaciones: { monto_asignado: number | string }[]): number {
  return asignaciones.reduce((suma, a) => suma + Number(a.monto_asignado), 0);
}

export async function leerCuentasDisponibles(supabase: SupabaseClient): Promise<CuentaDisponible[]> {
  const { data, error } = await supabase
    .from('cuentas')
    .select('id, nombre, saldo_actual, es_ahorro, incluir_en_saldo_total')
    .eq('activa', true)
    .eq('es_pasivo', false)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`No se pudieron leer las cuentas: ${error.message}`);

  return (data ?? []).map((c) => ({
    id: c.id as string,
    nombre: c.nombre as string,
    saldo: Number(c.saldo_actual),
    es_ahorro: Boolean(c.es_ahorro),
    incluir_en_saldo_total: c.incluir_en_saldo_total !== false,
  }));
}

/** Primer instante (UTC) del mes local de Colombia `desplazamiento` meses antes del mes de `hoy`. */
function inicioMesColombia(hoy: Date, desplazamiento: number): Date {
  const local = new Date(hoy.getTime() - OFFSET_COLOMBIA_HORAS * 3600_000);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - desplazamiento, 1, OFFSET_COLOMBIA_HORAS));
}

function claveMesColombia(fechaIso: string): string {
  const local = new Date(new Date(fechaIso).getTime() - OFFSET_COLOMBIA_HORAS * 3600_000);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Ahorro mensual = ingresos − gastos CONFIRMADOS, promediado sobre los últimos
 * meses calendario completos. Un mes con pendientes está incompleto (faltan
 * movimientos por revisar) y no entra al promedio: daría un ritmo engañoso.
 * Transferencias entre cuentas propias y ajustes de saldo no cuentan.
 */
export async function calcularRitmoAhorro(supabase: SupabaseClient, hoy: Date): Promise<RitmoAhorro> {
  const desde = inicioMesColombia(hoy, MESES_RITMO);
  const hasta = inicioMesColombia(hoy, 0); // excluye el mes en curso (incompleto)

  const { data, error } = await supabase
    .from('movimientos')
    .select('tipo, estado, monto, fecha_movimiento')
    .eq('eliminado', false)
    .in('tipo', ['income', 'expense'])
    .in('estado', ['confirmed', 'pending'])
    .gte('fecha_movimiento', desde.toISOString())
    .lt('fecha_movimiento', hasta.toISOString());

  if (error) throw new Error(`No se pudieron leer los movimientos: ${error.message}`);

  const meses = new Map<string, { ingresos: number; gastos: number; confirmados: number; pendientes: number }>();
  for (let i = MESES_RITMO; i >= 1; i--) {
    meses.set(claveMesColombia(inicioMesColombia(hoy, i).toISOString()), { ingresos: 0, gastos: 0, confirmados: 0, pendientes: 0 });
  }

  for (const m of data ?? []) {
    const mes = meses.get(claveMesColombia(m.fecha_movimiento as string));
    if (!mes) continue;
    if (m.estado === 'pending') {
      mes.pendientes++;
      continue;
    }
    mes.confirmados++;
    if (m.tipo === 'income') mes.ingresos += Number(m.monto);
    else mes.gastos += Number(m.monto);
  }

  const detalle: MesRitmo[] = [...meses.entries()].map(([mes, v]) => ({
    mes,
    ingresos: v.ingresos,
    gastos: v.gastos,
    ahorro: v.ingresos - v.gastos,
    usado: v.confirmados > 0 && v.pendientes === 0,
  }));
  const usados = detalle.filter((d) => d.usado);

  return {
    valor: usados.length > 0 ? usados.reduce((s, d) => s + d.ahorro, 0) / usados.length : null,
    meses_usados: usados.length,
    detalle_por_mes: detalle,
    confiable: usados.length >= MESES_MINIMOS_CONFIABLE,
  };
}

export interface DatosResumen {
  cuentas: { nombre: string; tipo: string; saldo: number; es_pasivo: boolean; es_ahorro: boolean; incluir_en_saldo_total: boolean }[];
  movimientos: { tipo: 'income' | 'expense'; estado: 'confirmed' | 'pending'; monto: number; fecha_movimiento: string; categoria_id: string | null }[];
  categorias: { id: string; nombre: string; categoria_padre_id: string | null }[];
  /** Inicio (UTC) del primer mes incluido. */
  desde: string;
}

/**
 * Lo necesario para el resumen financiero: cuentas activas, ingresos/gastos
 * (confirmados y pendientes) desde hace `meses` meses completos hasta hoy, y
 * las categorías para nombrarlos. Solo lectura.
 */
export async function leerDatosResumen(supabase: SupabaseClient, hoy: Date, meses: number): Promise<DatosResumen> {
  const desde = inicioMesColombia(hoy, meses).toISOString();

  const [cuentas, movimientos, categorias] = await Promise.all([
    supabase
      .from('cuentas')
      .select('nombre, tipo, saldo_actual, es_pasivo, es_ahorro, incluir_en_saldo_total')
      .eq('activa', true)
      .order('created_at', { ascending: true }),
    supabase
      .from('movimientos')
      .select('tipo, estado, monto, fecha_movimiento, categoria_id')
      .eq('eliminado', false)
      .in('tipo', ['income', 'expense'])
      .in('estado', ['confirmed', 'pending'])
      .gte('fecha_movimiento', desde),
    supabase.from('categorias').select('id, nombre, categoria_padre_id'),
  ]);

  const error = cuentas.error ?? movimientos.error ?? categorias.error;
  if (error) throw new Error(`No se pudieron leer los datos del resumen: ${error.message}`);

  return {
    cuentas: (cuentas.data ?? []).map((c) => ({
      nombre: c.nombre as string,
      tipo: c.tipo as string,
      saldo: Number(c.saldo_actual),
      es_pasivo: Boolean(c.es_pasivo),
      es_ahorro: Boolean(c.es_ahorro),
      incluir_en_saldo_total: c.incluir_en_saldo_total !== false,
    })),
    movimientos: (movimientos.data ?? []).map((m) => ({
      tipo: m.tipo as 'income' | 'expense',
      estado: m.estado as 'confirmed' | 'pending',
      monto: Number(m.monto),
      fecha_movimiento: m.fecha_movimiento as string,
      categoria_id: (m.categoria_id as string | null) ?? null,
    })),
    categorias: (categorias.data ?? []) as DatosResumen['categorias'],
    desde,
  };
}

export { claveMesColombia };

export async function leerObjetivos(supabase: SupabaseClient, cuentaIds: string[]): Promise<ObjetivoContexto[]> {
  const { data: objetivos, error } = await supabase
    .from('objetivos_ahorro')
    .select('id, nombre, monto_objetivo, fecha_objetivo')
    .eq('activo', true)
    .eq('estado', 'active')
    .order('prioridad', { ascending: true });

  if (error) throw new Error(`No se pudieron leer los objetivos: ${error.message}`);
  if (!objetivos || objetivos.length === 0) return [];

  const { data: asignaciones, error: errorAsignaciones } = await supabase
    .from('asignaciones_objetivo')
    .select('objetivo_id, cuenta_id, monto_asignado')
    .in('objetivo_id', objetivos.map((o) => o.id));

  if (errorAsignaciones) throw new Error(`No se pudieron leer las asignaciones: ${errorAsignaciones.message}`);

  return objetivos.map((o) => {
    const propias = (asignaciones ?? []).filter((a) => a.objetivo_id === o.id);
    return {
      nombre: o.nombre as string,
      monto_objetivo: Number(o.monto_objetivo),
      monto_asignado: montoAsignado(propias),
      asignado_en_cuentas: montoAsignado(propias.filter((a) => cuentaIds.includes(a.cuenta_id as string))),
      fecha_objetivo: (o.fecha_objetivo as string | null) ?? null,
    };
  });
}

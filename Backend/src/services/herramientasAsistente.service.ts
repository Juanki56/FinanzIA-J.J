import type { SupabaseClient } from '@supabase/supabase-js';
import {
  calcularRitmoAhorro,
  claveMesColombia,
  leerCuentasDisponibles,
  leerDatosResumen,
  leerObjetivos,
  type CuentaDisponible,
  type Fondos,
} from './contextoFinanciero.service.js';
import { proyectarObjetivos, resumirFinanzas, simularGasto } from './simulacionFinanciera.js';
import type { Herramienta, ResultadoHerramienta } from './asistenteIA.service.js';

// Catálogo de cálculos que el asistente puede pedir. Cada uno: valida sus
// parámetros, lee SOLO los datos que necesita (con el cliente del usuario,
// RLS activo) y llama a una función pura de simulacionFinanciera.ts.
// Ninguno escribe en la base.

export const PLAZO_MAXIMO_MESES = 120;
const MESES_RESUMEN = 3;

export interface ParametrosEntrada {
  monto?: unknown;
  plazo_meses?: unknown;
  ahorro_mensual?: unknown;
  /** Nombres de cuentas tal como los escribió el usuario (pregunta libre). */
  cuentas?: unknown;
  /** ids de cuentas elegidas en el formulario. */
  cuenta_ids?: unknown;
  /** "de todo lo que tengo": todas las cuentas disponibles. */
  todas_las_cuentas?: unknown;
}

export interface ParametrosValidados {
  monto: number | null;
  plazoMeses: number | null;
  ahorroMensual: number | null;
  cuentas: string[];
  cuentaIds: string[];
  todasLasCuentas: boolean;
}

const vacio = (v: unknown) => v === undefined || v === null || v === '';
const listaDeTextos = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()) : [];

/** Devuelve los parámetros validados, o un mensaje de lo que está mal o falta. */
export function validarParametros(
  herramienta: Exclude<Herramienta, 'fuera_de_alcance'>,
  entrada: ParametrosEntrada
): { ok: true; parametros: ParametrosValidados } | { ok: false; mensaje: string } {
  let monto: number | null = null;
  if (herramienta === 'simular_gasto') {
    monto = Number(entrada.monto);
    if (vacio(entrada.monto) || Number.isNaN(monto) || monto <= 0) {
      return { ok: false, mensaje: '¿Cuánto dinero quieres simular que gastas?' };
    }
  }

  let plazoMeses: number | null = null;
  if (herramienta === 'simular_gasto' && !vacio(entrada.plazo_meses)) {
    plazoMeses = Number(entrada.plazo_meses);
    if (!Number.isInteger(plazoMeses) || plazoMeses < 1 || plazoMeses > PLAZO_MAXIMO_MESES) {
      return { ok: false, mensaje: `El plazo para recuperarlo debe ser un número entero de meses entre 1 y ${PLAZO_MAXIMO_MESES}.` };
    }
  }

  let ahorroMensual: number | null = null;
  if (herramienta !== 'resumen_financiero' && !vacio(entrada.ahorro_mensual)) {
    ahorroMensual = Number(entrada.ahorro_mensual);
    if (Number.isNaN(ahorroMensual) || ahorroMensual < 0) {
      return { ok: false, mensaje: 'El ahorro mensual debe ser un número mayor o igual a 0.' };
    }
  }

  return {
    ok: true,
    parametros: {
      monto,
      plazoMeses,
      ahorroMensual,
      cuentas: listaDeTextos(entrada.cuentas),
      cuentaIds: listaDeTextos(entrada.cuenta_ids),
      todasLasCuentas: entrada.todas_las_cuentas === true,
    },
  };
}

/** "YYYY-MM-DD" de hoy en hora de Colombia (UTC-5), no en la del servidor. */
export function hoyColombia(ahora: Date): string {
  return new Date(ahora.getTime() - 5 * 3600_000).toISOString().slice(0, 10);
}

/** Minúsculas y sin tildes, para comparar "bancolombia" con "Bancolombia". */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function sumarFondos(cuentas: CuentaDisponible[], origen: Fondos['origen']): Fondos {
  return {
    cuentas: cuentas.map((c) => ({ nombre: c.nombre, saldo: c.saldo })),
    total: cuentas.reduce((s, c) => s + c.saldo, 0),
    cuentaIds: cuentas.map((c) => c.id),
    origen,
  };
}

/**
 * Elige de qué cuentas sale el gasto simulado (función pura):
 * - ids del formulario, o nombres que el usuario escribió → esas cuentas;
 * - "todas" → todo lo disponible (las que cuentan en el saldo total);
 * - nada → las cuentas marcadas como ahorro, o todo si no hay ninguna marcada.
 * Si un nombre no coincide con ninguna cuenta, o coincide con varias, se
 * pide aclarar en vez de adivinar.
 */
export function elegirFondos(
  disponibles: CuentaDisponible[],
  p: Pick<ParametrosValidados, 'cuentas' | 'cuentaIds' | 'todasLasCuentas'>
): { ok: true; fondos: Fondos } | { ok: false; mensaje: string } {
  const lista = disponibles.map((c) => c.nombre).join(', ');

  if (p.cuentaIds.length > 0) {
    const elegidas = disponibles.filter((c) => p.cuentaIds.includes(c.id));
    if (elegidas.length === 0) return { ok: false, mensaje: `Elige al menos una cuenta. Tus cuentas son: ${lista}.` };
    return { ok: true, fondos: sumarFondos(elegidas, 'nombradas') };
  }

  if (p.cuentas.length > 0) {
    const elegidas: CuentaDisponible[] = [];
    for (const nombre of p.cuentas) {
      const buscado = normalizar(nombre);
      const exacta = disponibles.find((c) => normalizar(c.nombre) === buscado);
      const parciales = disponibles.filter((c) => {
        const propio = normalizar(c.nombre);
        return propio.includes(buscado) || buscado.includes(propio);
      });
      const encontrada = exacta ?? (parciales.length === 1 ? parciales[0] : undefined);
      if (!encontrada && parciales.length > 1) {
        return { ok: false, mensaje: `"${nombre}" puede ser ${parciales.map((c) => c.nombre).join(' o ')}. ¿Cuál?` };
      }
      if (!encontrada) {
        return { ok: false, mensaje: `No encontré una cuenta llamada "${nombre}". Tus cuentas son: ${lista}.` };
      }
      if (!elegidas.includes(encontrada)) elegidas.push(encontrada);
    }
    return { ok: true, fondos: sumarFondos(elegidas, 'nombradas') };
  }

  const enTotal = disponibles.filter((c) => c.incluir_en_saldo_total);
  if (p.todasLasCuentas) return { ok: true, fondos: sumarFondos(enTotal, 'todas') };

  const deAhorro = disponibles.filter((c) => c.es_ahorro);
  return { ok: true, fondos: deAhorro.length > 0 ? sumarFondos(deAhorro, 'ahorro') : sumarFondos(enTotal, 'todas') };
}

export async function ejecutarHerramienta(
  supabase: SupabaseClient,
  herramienta: Exclude<Herramienta, 'fuera_de_alcance'>,
  p: ParametrosValidados
): Promise<{ ok: true; resultado: ResultadoHerramienta } | { ok: false; mensaje: string }> {
  const ahora = new Date();
  const hoy = hoyColombia(ahora);
  const ritmoPromesa = calcularRitmoAhorro(supabase, ahora);

  switch (herramienta) {
    case 'simular_gasto': {
      const eleccion = elegirFondos(await leerCuentasDisponibles(supabase), p);
      if (!eleccion.ok) return eleccion;
      const [ritmo, objetivos] = await Promise.all([ritmoPromesa, leerObjetivos(supabase, eleccion.fondos.cuentaIds)]);
      return {
        ok: true,
        resultado: simularGasto(
          { hoy, fondos: eleccion.fondos, ritmo, objetivos },
          { monto: p.monto as number, plazoMeses: p.plazoMeses, ahorroMensual: p.ahorroMensual }
        ),
      };
    }
    case 'proyeccion_objetivos': {
      const [ritmo, objetivos] = await Promise.all([ritmoPromesa, leerObjetivos(supabase, [])]);
      return { ok: true, resultado: proyectarObjetivos({ hoy, ritmo, objetivos }, { ahorroMensual: p.ahorroMensual }) };
    }
    case 'resumen_financiero': {
      const [ritmo, objetivos, datos] = await Promise.all([
        ritmoPromesa,
        leerObjetivos(supabase, []),
        leerDatosResumen(supabase, ahora, MESES_RESUMEN),
      ]);
      return { ok: true, resultado: resumirFinanzas(datos, { hoy, ritmo, objetivos }, claveMesColombia) };
    }
  }
}

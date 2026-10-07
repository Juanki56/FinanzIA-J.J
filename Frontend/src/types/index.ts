// Tipos que reflejan uno a uno los recursos expuestos por el backend de FinanzIA.
// No inventar campos que el backend no devuelve.

export type TipoCuenta =
  | 'cash'
  | 'bank'
  | 'ewallet'
  | 'savings'
  | 'credit_card'
  | 'investment'
  | 'loan'
  | 'other'

export interface Usuario {
  id: string
  nombre: string
  email: string
  moneda_principal: string
  zona_horaria: string
}

export interface Cuenta {
  id: string
  usuario_id?: string
  nombre: string
  tipo: TipoCuenta
  institucion: string | null
  moneda: string
  saldo_inicial: number
  saldo_actual: number
  es_pasivo: boolean
  incluir_en_saldo_total?: boolean
  activa: boolean
  limite_credito: number | null
  dia_corte: number | null
  dia_pago: number | null
  notas?: string | null
  /** Lo que cobra el plan por cada retiro de efectivo (0 = nada). */
  comision_retiro?: number
  /** La cuenta no está exenta del 4x1000: cada salida paga el 0,4%. */
  cobra_gmf?: boolean
  /** Cuenta de ahorro: el simulador la usa como "tus ahorros". */
  es_ahorro?: boolean
  /** Pendientes que todavía no cuentan en saldo_actual (posteriores al último ajuste de saldo). Solo en el listado. */
  pendientes?: { cantidad: number; ingresos: number; gastos: number }
  /** Pendientes con fecha hasta aquí ya están cubiertos por el saldo (último ajuste o creación). Solo en el listado. */
  pendientes_desde?: string
}

export type TipoMovimiento = 'income' | 'expense' | 'adjustment' | 'transfer'
export type EstadoMovimiento = 'pending' | 'confirmed' | 'cancelled'

export interface Movimiento {
  id: string
  usuario_id: string
  cuenta_id: string
  categoria_id: string | null
  tipo: TipoMovimiento
  monto: number
  signo: 1 | -1 | null
  descripcion: string | null
  comercio: string | null
  fecha_movimiento: string
  estado: EstadoMovimiento
  eliminado: boolean
  deleted_at: string | null
  transferencia_id?: string | null
  /** 'gmail' = lo creó la sincronización a partir de un correo del banco; 'system' = cobro bancario derivado. */
  origen?: 'manual' | 'gmail' | 'import' | 'system'
  created_at?: string
}

export type EstadoTransferencia = 'pending' | 'completed' | 'cancelled'

export interface Transferencia {
  id: string
  usuario_id?: string
  cuenta_origen_id: string
  cuenta_destino_id: string
  monto: number
  descripcion: string | null
  fecha_transferencia: string
  estado: EstadoTransferencia
  created_at?: string
}

export type TipoCategoria = 'income' | 'expense' | 'both'

export interface Categoria {
  id: string
  usuario_id?: string
  categoria_padre_id: string | null
  nombre: string
  tipo: TipoCategoria
  icono: string | null
  color: string | null
  activa: boolean
}

export type PeriodoPresupuesto = 'weekly' | 'monthly' | 'yearly' | 'custom'

export interface Presupuesto {
  id: string
  usuario_id?: string
  categoria_id: string | null
  nombre: string
  monto_limite: number
  periodo: PeriodoPresupuesto
  fecha_inicio: string
  fecha_fin: string | null
  permitir_exceder: boolean
  activo: boolean
  // Calculados por el backend, solo lectura:
  gastado: number
  disponible: number
}

export type EstadoObjetivo = 'active' | 'completed' | 'paused' | 'cancelled'

export interface ObjetivoAhorro {
  id: string
  usuario_id?: string
  nombre: string
  descripcion: string | null
  monto_objetivo: number
  fecha_objetivo: string | null
  prioridad: number
  estado: EstadoObjetivo
  activo: boolean
  // Calculados por el backend, solo lectura:
  monto_asignado: number
  faltante: number
}

export interface AsignacionObjetivo {
  id: string
  usuario_id?: string
  objetivo_id: string
  cuenta_id: string
  monto_asignado: number
  notas: string | null
}

export type FrecuenciaRecurrente = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'

export interface TransaccionRecurrente {
  id: string
  usuario_id?: string
  cuenta_id: string
  categoria_id: string | null
  nombre: string
  descripcion: string | null
  tipo: 'income' | 'expense'
  monto_estimado: number
  frecuencia: FrecuenciaRecurrente
  intervalo: number | null
  dia_del_mes: number | null
  dia_de_la_semana: number | null
  fecha_inicio: string
  fecha_fin: string | null
  proxima_fecha: string
  tolerancia_monto: number | null
  activa: boolean
}

export interface ApiErrorBody {
  error: string
  detalle?: string
}

export interface Paginacion {
  pagina: number
  limite: number
  total: number
  total_paginas: number
}

export interface MovimientosPage {
  movimientos: Movimiento[]
  paginacion: Paginacion
}

export interface Conexion {
  id: string
  proveedor: string
  tipo: string
  identificador_externo: string | null
  estado: string
  scopes: string[]
  token_expira_at: string | null
  ultima_sincronizacion_at: string | null
  cuenta_predeterminada_id: string | null
  created_at: string
}

/** Correo bancario guardado por la sincronización (tabla fuentes_movimiento). */
export interface FuenteMovimiento {
  id: string
  asunto: string | null
  remitente: string
  fecha_recibido: string
  estado_procesamiento: 'pending' | 'processed' | 'ignored' | 'error'
  metadata: { texto_normalizado?: string; descartado?: boolean } | null
}

export interface ResumenSincronizacion {
  correos_nuevos: number
  movimientos_creados: number
  sin_reconocer: number
}

/** Espejo de CodigoAdvertencia (Backend/src/services/simulacionFinanciera.ts). */
export type AdvertenciaSimulacion =
  | 'sin_fondos'
  | 'ritmo_sin_datos'
  | 'ritmo_no_positivo'
  | 'gasto_supera_saldo'
  | 'toca_objetivos'
  | 'objetivo_vencido'
  | 'sin_objetivos'
  | 'hay_pendientes'

export type RitmoSimulacion = { valor: number | null; fuente: 'usuario' | 'calculado' | 'ninguno'; meses_usados: number; calculado: number | null }

/** Espejo de ResultadoGasto (Backend/src/services/simulacionFinanciera.ts). */
export interface SimulacionGasto {
  tipo: 'gasto'
  fecha_calculo: string
  parametros: { monto: number; plazo_meses: number | null; ahorro_mensual_usuario: number | null }
  fondos: {
    /** nombradas = las cuentas que elegiste; ahorro = tus cuentas de ahorro; todas = todo lo disponible. */
    origen: 'nombradas' | 'ahorro' | 'todas'
    cuentas: { nombre: string; saldo: number }[]
    actual: number
    despues: number
    porcentaje_que_representa: number | null
    alcanza: boolean
    faltante: number
  }
  ritmo: RitmoSimulacion
  recuperacion:{ meses: number; dias: number; fecha_estimada: string } | null
  recuperacion_en_plazo: { plazo_meses: number; adicional_mensual: number; mensual_requerido: number | null } | null
  objetivos: {
    asignado_en_cuentas: number
    libre_antes: number
    toca_objetivos: boolean
    monto_que_toca: number
    lista: {
      nombre: string
      monto_objetivo: number
      monto_asignado: number
      faltante: number
      fecha_objetivo: string | null
      vencido: boolean
    }[]
  }
  advertencias: AdvertenciaSimulacion[]
  supuestos: string[]
}

/** Espejo de ResultadoProyeccionObjetivos (Backend/src/services/simulacionFinanciera.ts). */
export interface ProyeccionObjetivos {
  tipo: 'proyeccion_objetivos'
  fecha_calculo: string
  parametros: { ahorro_mensual_usuario: number | null }
  ritmo: RitmoSimulacion
  objetivos: {
    nombre: string
    monto_objetivo: number
    monto_asignado: number
    faltante: number
    fecha_objetivo: string | null
    meses_para_llegar: number | null
    fecha_estimada: string | null
    necesario_mensual: number | null
    llega_a_tiempo: boolean | null
    vencido: boolean
  }[]
  advertencias: AdvertenciaSimulacion[]
  supuestos: string[]
}

/** Espejo de ResultadoResumenFinanciero (Backend/src/services/simulacionFinanciera.ts). */
export interface ResumenFinanciero {
  tipo: 'resumen_financiero'
  fecha_calculo: string
  saldos: {
    disponible: number
    ahorro: number
    deudas: number
    cuentas: { nombre: string; saldo: number; es_ahorro: boolean; es_pasivo: boolean }[]
  }
  meses: { mes: string; en_curso: boolean; ingresos: number; gastos: number; balance: number; pendientes: number }[]
  categorias_mes_actual: { categoria: string; gasto: number }[]
  categorias_periodo: { categoria: string; gasto: number }[]
  ritmo: RitmoSimulacion
  objetivos: { nombre: string; monto_objetivo: number; monto_asignado: number; faltante: number; fecha_objetivo: string | null }[]
  advertencias: AdvertenciaSimulacion[]
  supuestos: string[]
}

export type ResultadoAsistente = SimulacionGasto | ProyeccionObjetivos | ResumenFinanciero

export interface ExplicacionIA {
  explicacion: { texto: string; modelo: string } | null
  explicacion_error: string | null
}

export interface RespuestaSimulacion<T> extends ExplicacionIA {
  simulacion: T
}

export interface RespuestaPregunta extends ExplicacionIA {
  herramienta: 'simular_gasto' | 'proyeccion_objetivos' | 'resumen_financiero' | 'fuera_de_alcance'
  parametros: {
    monto: number | null
    plazo_meses: number | null
    ahorro_mensual: number | null
    cuentas?: string[]
    todas_las_cuentas?: boolean
  } | null
  /** Si viene, no hubo cálculo: hay que responderle esto al usuario (falta un dato o está fuera de alcance). */
  aclaracion: string | null
  resultado: ResultadoAsistente | null
}

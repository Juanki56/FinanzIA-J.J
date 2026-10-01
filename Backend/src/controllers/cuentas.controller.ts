import type { Request, Response } from 'express';

const TIPOS_VALIDOS = ['cash', 'bank', 'ewallet', 'savings', 'credit_card', 'investment', 'loan', 'other'];

const CAMPOS_ACTUALIZABLES = [
  'nombre', 'tipo', 'moneda', 'institucion', 'activa',
  'es_pasivo', 'incluir_en_saldo_total', 'limite_credito',
  'dia_corte', 'dia_pago', 'notas',
] as const;

export async function listarCuentas(req: Request, res: Response) {
  const { data, error } = await req.supabase
    .from('cuentas')
    .select('id, nombre, tipo, moneda, saldo_inicial, saldo_actual, activa, institucion, es_pasivo')
    .order('created_at', { ascending: true });

  if (error) {
    return res.status(500).json({ error: 'Error al consultar las cuentas' });
  }

  res.json({ cuentas: data });
}

export async function crearCuenta(req: Request, res: Response) {
  const {
    nombre, tipo, moneda, saldo_inicial,
    institucion, es_pasivo, incluir_en_saldo_total,
    limite_credito, dia_corte, dia_pago, notas,
  } = req.body ?? {};

  if (typeof nombre !== 'string' || !nombre.trim()) {
    return res.status(400).json({ error: 'El campo nombre es obligatorio' });
  }

  if (typeof tipo !== 'string' || !TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ error: `tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}` });
  }

  const saldoInicialNum = saldo_inicial === undefined ? 0 : Number(saldo_inicial);
  if (Number.isNaN(saldoInicialNum)) {
    return res.status(400).json({ error: 'saldo_inicial debe ser un número' });
  }

  const nuevaCuenta: Record<string, unknown> = {
    usuario_id: req.usuario.id,
    nombre: nombre.trim(),
    tipo,
    saldo_inicial: saldoInicialNum,
    saldo_actual: saldoInicialNum,
  };

  if (moneda !== undefined) nuevaCuenta.moneda = moneda;
  if (institucion !== undefined) nuevaCuenta.institucion = institucion;
  if (es_pasivo !== undefined) nuevaCuenta.es_pasivo = es_pasivo;
  if (incluir_en_saldo_total !== undefined) nuevaCuenta.incluir_en_saldo_total = incluir_en_saldo_total;
  if (limite_credito !== undefined) nuevaCuenta.limite_credito = limite_credito;
  if (dia_corte !== undefined) nuevaCuenta.dia_corte = dia_corte;
  if (dia_pago !== undefined) nuevaCuenta.dia_pago = dia_pago;
  if (notas !== undefined) nuevaCuenta.notas = notas;

  const { data, error } = await req.supabase
    .from('cuentas')
    .insert(nuevaCuenta)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: 'Error al crear la cuenta', detalle: error.message });
  }

  res.status(201).json({ cuenta: data });
}

export async function actualizarCuenta(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body ?? {};

  if ('saldo_inicial' in body || 'saldo_actual' in body || 'usuario_id' in body) {
    return res.status(400).json({
      error: 'saldo_inicial, saldo_actual y usuario_id no se pueden modificar directamente. Los saldos cambian únicamente a través de movimientos.',
    });
  }

  const cambios: Record<string, unknown> = {};
  for (const campo of CAMPOS_ACTUALIZABLES) {
    if (campo in body) cambios[campo] = body[campo];
  }

  if (Object.keys(cambios).length === 0) {
    return res.status(400).json({ error: 'No se enviaron campos válidos para actualizar' });
  }

  if (cambios.tipo !== undefined && !TIPOS_VALIDOS.includes(cambios.tipo as string)) {
    return res.status(400).json({ error: `tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}` });
  }

  const { data, error } = await req.supabase
    .from('cuentas')
    .update(cambios)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }
    return res.status(500).json({ error: 'Error al actualizar la cuenta', detalle: error.message });
  }

  res.json({ cuenta: data });
}
/** POST /api/cuentas/:id/ajustar-saldo — lleva saldo_actual a `saldo_nuevo`
 * creando un movimiento tipo 'adjustment' por la diferencia. El saldo nunca se
 * escribe directamente: así el cambio queda auditado en movimientos como
 * cualquier otro. */
export async function ajustarSaldoCuenta(req: Request, res: Response) {
  const { id } = req.params;
  const saldoNuevo = Number(req.body?.saldo_nuevo);

  if (req.body?.saldo_nuevo === undefined || req.body?.saldo_nuevo === '' || Number.isNaN(saldoNuevo)) {
    return res.status(400).json({ error: 'saldo_nuevo debe ser un número' });
  }

  const { data: cuenta, error: errorCuenta } = await req.supabase
    .from('cuentas')
    .select('id, saldo_actual, moneda')
    .eq('id', id)
    .maybeSingle();

  if (errorCuenta) {
    return res.status(500).json({ error: 'Error al consultar la cuenta' });
  }
  if (!cuenta) {
    return res.status(404).json({ error: 'Cuenta no encontrada' });
  }

  const saldoAnterior = Number(cuenta.saldo_actual);
  // Redondeo a centavos para que errores de coma flotante no generen ajustes fantasma.
  const diferencia = Math.round((saldoNuevo - saldoAnterior) * 100) / 100;

  if (diferencia === 0) {
    return res.status(400).json({ error: 'El saldo nuevo es igual al saldo actual, no hay nada que ajustar' });
  }

  const { data: movimiento, error: errorMovimiento } = await req.supabase
    .from('movimientos')
    .insert({
      usuario_id: req.usuario.id,
      cuenta_id: id,
      tipo: 'adjustment',
      signo: diferencia > 0 ? 1 : -1,
      monto: Math.abs(diferencia),
      estado: 'confirmed',
      descripcion: `Ajuste manual de saldo: ${saldoAnterior} → ${saldoNuevo} ${cuenta.moneda}`,
    })
    .select()
    .single();

  if (errorMovimiento) {
    return res.status(500).json({ error: 'Error al registrar el ajuste de saldo', detalle: errorMovimiento.message });
  }

  // Los saldos los recalcula la base de datos; se relee la cuenta para
  // confirmar que el ajuste dejó el saldo donde el usuario pidió.
  const { data: cuentaActualizada } = await req.supabase
    .from('cuentas')
    .select('id, nombre, tipo, moneda, saldo_inicial, saldo_actual, activa, institucion, es_pasivo')
    .eq('id', id)
    .single();

  const cuadra = cuentaActualizada ? Math.abs(Number(cuentaActualizada.saldo_actual) - saldoNuevo) < 0.005 : false;

  res.status(201).json({ cuenta: cuentaActualizada, movimiento, cuadra });
}

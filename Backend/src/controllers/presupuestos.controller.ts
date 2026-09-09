import type { Request, Response } from 'express';

const PERIODOS_VALIDOS = ['weekly', 'monthly', 'yearly', 'custom'];

export async function listarPresupuestos(req: Request, res: Response) {
  const soloActivos = req.query.solo_activos !== 'false';

  let query = req.supabase.from('presupuestos').select('*').order('fecha_inicio', { ascending: false });

  if (soloActivos) {
    query = query.eq('activo', true);
  }

  const { data: presupuestos, error } = await query;

  if (error) {
    return res.status(500).json({ error: 'Error al consultar los presupuestos' });
  }

  // Calculamos "gastado" para cada presupuesto a partir de movimientos reales
  const conGastado = await Promise.all(
    (presupuestos ?? []).map(async (p) => {
      let mQuery = req.supabase
        .from('movimientos')
        .select('monto')
        .eq('tipo', 'expense')
        .eq('estado', 'confirmed')
        .eq('eliminado', false)
        .gte('fecha_movimiento', p.fecha_inicio);

      if (p.fecha_fin) mQuery = mQuery.lte('fecha_movimiento', p.fecha_fin);
      if (p.categoria_id) mQuery = mQuery.eq('categoria_id', p.categoria_id);

      const { data: movs } = await mQuery;
      const gastado = (movs ?? []).reduce((suma, m) => suma + Number(m.monto), 0);

      return { ...p, gastado, disponible: Number(p.monto_limite) - gastado };
    })
  );

  res.json({ presupuestos: conGastado });
}

export async function crearPresupuesto(req: Request, res: Response) {
  const { nombre, categoria_id, monto_limite, periodo, fecha_inicio, fecha_fin, permitir_exceder } = req.body ?? {};

  if (typeof nombre !== 'string' || !nombre.trim()) {
    return res.status(400).json({ error: 'El campo nombre es obligatorio' });
  }

  const montoNum = Number(monto_limite);
  if (!monto_limite || Number.isNaN(montoNum) || montoNum <= 0) {
    return res.status(400).json({ error: 'monto_limite debe ser un número mayor a 0' });
  }

  const periodoFinal = periodo === undefined ? 'monthly' : periodo;
  if (!PERIODOS_VALIDOS.includes(periodoFinal)) {
    return res.status(400).json({ error: `periodo debe ser uno de: ${PERIODOS_VALIDOS.join(', ')}` });
  }

  if (typeof fecha_inicio !== 'string') {
    return res.status(400).json({ error: 'fecha_inicio es obligatoria (formato YYYY-MM-DD)' });
  }

  const nuevoPresupuesto: Record<string, unknown> = {
    usuario_id: req.usuario.id,
    nombre: nombre.trim(),
    monto_limite: montoNum,
    periodo: periodoFinal,
    fecha_inicio,
  };

  if (categoria_id !== undefined) nuevoPresupuesto.categoria_id = categoria_id;
  if (fecha_fin !== undefined) nuevoPresupuesto.fecha_fin = fecha_fin;
  if (permitir_exceder !== undefined) nuevoPresupuesto.permitir_exceder = permitir_exceder;

  const { data, error } = await req.supabase
    .from('presupuestos')
    .insert(nuevoPresupuesto)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: 'Error al crear el presupuesto', detalle: error.message });
  }

  res.status(201).json({ presupuesto: data });
}

export async function actualizarPresupuesto(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body ?? {};

  if ('usuario_id' in body) {
    return res.status(400).json({ error: 'usuario_id no se puede modificar' });
  }

  if ('periodo' in body && !PERIODOS_VALIDOS.includes(body.periodo)) {
    return res.status(400).json({ error: `periodo debe ser uno de: ${PERIODOS_VALIDOS.join(', ')}` });
  }

  const { data, error } = await req.supabase
    .from('presupuestos')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }
    return res.status(400).json({ error: 'Error al actualizar el presupuesto', detalle: error.message });
  }

  res.json({ presupuesto: data });
}

export async function eliminarPresupuesto(req: Request, res: Response) {
  const { id } = req.params;

  const { error } = await req.supabase.from('presupuestos').delete().eq('id', id);

  if (error) {
    return res.status(500).json({ error: 'Error al eliminar el presupuesto', detalle: error.message });
  }

  res.status(204).send();
}
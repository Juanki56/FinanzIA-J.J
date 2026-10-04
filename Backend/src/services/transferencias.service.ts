import { SupabaseClient } from '@supabase/supabase-js';

interface DatosTransferencia {
  cuenta_origen_id: string;
  cuenta_destino_id: string;
  monto: number;
  descripcion?: string | undefined;
  fecha_transferencia?: string | undefined;
}

export async function crearTransferenciaAtomica(supabase: SupabaseClient, datos: DatosTransferencia) {
  return supabase.rpc('crear_transferencia', {
    p_cuenta_origen_id: datos.cuenta_origen_id,
    p_cuenta_destino_id: datos.cuenta_destino_id,
    p_monto: datos.monto,
    // movimientos.descripcion es NOT NULL: sin descripción, la RPC falla con 23502
    p_descripcion: datos.descripcion?.trim() || 'Transferencia',
    p_fecha_transferencia: datos.fecha_transferencia ?? new Date().toISOString().slice(0, 10),
  });
}

export async function editarTransferenciaAtomica(supabase: SupabaseClient, id: string, datos: DatosTransferencia) {
  return supabase.rpc('editar_transferencia', {
    p_id: id,
    p_cuenta_origen_id: datos.cuenta_origen_id,
    p_cuenta_destino_id: datos.cuenta_destino_id,
    p_monto: datos.monto,
    p_descripcion: datos.descripcion?.trim() || 'Transferencia',
    p_fecha_transferencia: datos.fecha_transferencia ?? null,
  });
}

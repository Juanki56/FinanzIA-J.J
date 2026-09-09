import { SupabaseClient } from '@supabase/supabase-js';

interface DatosTransferencia {
  cuenta_origen_id: string;
  cuenta_destino_id: string;
  monto: number;
  descripcion?: string;
  fecha_transferencia?: string;
}

export async function crearTransferenciaAtomica(supabase: SupabaseClient, datos: DatosTransferencia) {
  return supabase.rpc('crear_transferencia', {
    p_cuenta_origen_id: datos.cuenta_origen_id,
    p_cuenta_destino_id: datos.cuenta_destino_id,
    p_monto: datos.monto,
    p_descripcion: datos.descripcion ?? null,
    p_fecha_transferencia: datos.fecha_transferencia ?? new Date().toISOString().slice(0, 10),
  });
}
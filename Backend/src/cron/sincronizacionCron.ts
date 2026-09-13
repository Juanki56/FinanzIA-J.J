import cron from 'node-cron';
import { crearClienteAdmin } from '../lib/supabaseAdmin.js';
import { sincronizarConexion } from '../services/sincronizacion.service.js';

const INTERVALO_MINUTOS = Number(process.env.SYNC_INTERVAL_MINUTOS) || 30;

// Confirmado: la función es SETOF conexiones, así que devuelve las 15 columnas
// completas de la tabla por cada fila activa (de cualquier usuario), no solo
// las que usamos hoy. Solo tipamos los campos que este archivo realmente lee;
// el resto sigue disponible en runtime si algún día hace falta (ej. `scopes`
// si se soporta más de un proveedor).
interface ConexionActivaServicio {
  id: string;
  usuario_id: string;
  cuenta_predeterminada_id: string | null;
  ultima_sincronizacion_at: string | null;
  proveedor: string;
  tipo: string;
  estado: string;
  scopes: string[];
}

/**
 * Corre la sincronización para TODAS las conexiones activas de TODOS los
 * usuarios. Usa el cliente de service_role — por eso cada consulta que toca
 * `movimientos` o `fuentes_movimiento` dentro de sincronizarConexion() lleva
 * su propio `.eq('usuario_id', ...)` explícito (ver ese archivo). Aquí mismo,
 * la única escritura directa (actualizar_ultima_sincronizacion) también lo hace.
 *
 * Un fallo en una conexión individual (token revocado, Gmail caído, etc.) no
 * debe tumbar la sincronización de las demás — por eso el try/catch está
 * DENTRO del for, no alrededor de todo el método.
 */
export async function ejecutarSincronizacionGlobal(): Promise<void> {
  const admin = crearClienteAdmin();

  const { data: conexiones, error } = await admin.rpc('listar_conexiones_activas_servicio');

  if (error) {
    console.error('[cron sincronizacion] no se pudo listar conexiones activas:', error.message);
    return;
  }

  for (const conexion of (conexiones ?? []) as ConexionActivaServicio[]) {
    if (conexion.proveedor !== 'google') {
      // Este servicio solo sabe sincronizar Gmail por ahora. Defensivo: si el
      // día de mañana hay otro proveedor de conexión, que no intente tratarlo como Gmail.
      continue;
    }
    if (!conexion.cuenta_predeterminada_id) {
      console.log(`[cron sincronizacion] conexión ${conexion.id} sin cuenta_predeterminada_id configurada, se salta`);
      continue;
    }

    try {
      const resumen = await sincronizarConexion({
        supabase: admin,
        usuarioId: conexion.usuario_id,
        conexionId: conexion.id,
        cuentaPredeterminadaId: conexion.cuenta_predeterminada_id,
        ultimaSincronizacionAt: conexion.ultima_sincronizacion_at,

        leerTokens: async () => {
          const { data, error } = await admin.rpc('leer_tokens_conexion_servicio', {
            p_conexion_id: conexion.id,
          });
          if (error || !data?.[0]) {
            throw new Error(
              `No se pudieron leer los tokens (servicio) de la conexión ${conexion.id}: ${error?.message ?? 'la RPC devolvió una fila vacía'}`
            );
          }
          return data[0];
        },

        guardarTokens: async (nuevo) => {
          const { error } = await admin.rpc('actualizar_tokens_conexion_servicio', {
            p_conexion_id: conexion.id,
            p_access_token: nuevo.access_token,
            ...(nuevo.refresh_token ? { p_refresh_token: nuevo.refresh_token } : {}),
            ...(nuevo.token_expira_at ? { p_token_expira_at: nuevo.token_expira_at } : {}),
          });
          if (error) {
            throw new Error(`No se pudieron guardar los tokens renovados (servicio) de ${conexion.id}: ${error.message}`);
          }
        },

        actualizarUltimaSincronizacion: async (fechaIso) => {
          await admin
            .from('conexiones')
            .update({ ultima_sincronizacion_at: fechaIso })
            .eq('id', conexion.id)
            .eq('usuario_id', conexion.usuario_id); // cinturón y tirantes, aunque el id ya es único
        },
      });

      console.log(`[cron sincronizacion] conexión ${conexion.id} (usuario ${conexion.usuario_id}):`, resumen);
    } catch (err) {
      console.error(`[cron sincronizacion] fallo en conexión ${conexion.id}, se continúa con las demás:`, err);
    }
  }
}

export function iniciarCronSincronizacion(): void {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      '[cron sincronizacion] falta SUPABASE_SERVICE_ROLE_KEY en el .env — el cron de sincronización de correos NO se inicia.'
    );
    return;
  }

  console.log(`[cron sincronizacion] programado cada ${INTERVALO_MINUTOS} minuto(s)`);

  cron.schedule(`*/${INTERVALO_MINUTOS} * * * *`, () => {
    ejecutarSincronizacionGlobal().catch((err) => {
      console.error('[cron sincronizacion] error inesperado en la corrida:', err);
    });
  });
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Cliente de Supabase con la clave de `service_role` — salta RLS por completo.
 *
 * USO EXCLUSIVO: el cron de sincronización de correos (`cron/sincronizacionCron.ts`),
 * que no tiene un JWT de usuario disponible (nadie está logueado cuando corre).
 *
 * NUNCA reutilizar este cliente para nada que responda a una request HTTP de
 * un usuario — para eso siempre `crearClienteConToken(jwt)` de `lib/supabase.ts`,
 * que sí respeta RLS.
 *
 * Como este cliente no tiene la protección de RLS detrás, todo el código que lo
 * usa (el cron y el servicio de sincronización cuando corre desde el cron) debe
 * filtrar explícitamente por `usuario_id` en cada consulta a una tabla con datos
 * de usuario — no hay red de seguridad si se nos olvida.
 */
let clienteAdmin: SupabaseClient | null = null;

export function crearClienteAdmin(): SupabaseClient {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Falta SUPABASE_SERVICE_ROLE_KEY en el .env — es necesaria para el cron de sincronización de correos. ' +
        'Consíguela en el dashboard de Supabase (Project Settings > API > service_role key).'
    );
  }

  if (!clienteAdmin) {
    clienteAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return clienteAdmin;
}

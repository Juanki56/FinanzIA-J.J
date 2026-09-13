import type { SupabaseClient } from '@supabase/supabase-js';

const CAMPOS_VALIDOS = ['comercio', 'descripcion', 'remitente', 'asunto'] as const;
type CampoObjetivo = (typeof CAMPOS_VALIDOS)[number];

const OPERADORES_VALIDOS = ['equals', 'contains', 'starts_with', 'ends_with'] as const;
type Operador = (typeof OPERADORES_VALIDOS)[number];

interface Regla {
  id: string;
  categoria_id: string;
  valor: string;
  campo_objetivo: CampoObjetivo;
  operador: Operador;
  veces_aplicada: number;
}

interface CamposParaMatch {
  comercio: string | null;
  descripcion: string | null;
  remitente: string | null;
  asunto: string | null;
}

function coincide(textoCampo: string, valorRegla: string, operador: Operador): boolean {
  // Insensible a mayúsculas/minúsculas por decisión explícita del proyecto
  // (SPOTIFY debe coincidir con Spotify o spotify).
  const t = textoCampo.toLowerCase();
  const v = valorRegla.toLowerCase();
  switch (operador) {
    case 'equals':
      return t === v;
    case 'contains':
      return t.includes(v);
    case 'starts_with':
      return t.startsWith(v);
    case 'ends_with':
      return t.endsWith(v);
  }
}

/**
 * Busca la primera regla activa del usuario que coincida con los campos dados.
 * Evalúa por prioridad ASCENDENTE (el número más bajo se evalúa primero),
 * consistente con el índice idx_reglas_categorizacion_activas.
 *
 * SIEMPRE recibe usuarioId explícito y SIEMPRE filtra por él, sin importar si
 * el `supabase` dado ya es un cliente atado a un JWT (donde RLS lo filtraría
 * de todas formas) o el cliente de service_role del cron (donde RLS no aplica
 * y este filtro es la única protección).
 */
export async function buscarCategoriaPorReglas(
  supabase: SupabaseClient,
  usuarioId: string,
  campos: CamposParaMatch
): Promise<string | null> {
  const { data: reglas, error } = await supabase
    .from('reglas_categorizacion')
    .select('id, categoria_id, valor, campo_objetivo, operador, veces_aplicada')
    .eq('usuario_id', usuarioId)
    .eq('activa', true)
    .order('prioridad', { ascending: true });

  if (error || !reglas) return null;

  for (const regla of reglas as Regla[]) {
    const valorCampo = campos[regla.campo_objetivo];
    if (valorCampo == null) continue;

    if (coincide(valorCampo, regla.valor, regla.operador)) {
      // Incrementamos el contador de uso. Pequeña ventana de condición de
      // carrera aceptable: es un contador informativo, no algo que afecte
      // saldos ni categorización. Nota: las queries de supabase-js son
      // "thenables" perezosas — sin await (o .then()) nunca se envían.
      await supabase
        .from('reglas_categorizacion')
        .update({ veces_aplicada: regla.veces_aplicada + 1 })
        .eq('id', regla.id)
        .eq('usuario_id', usuarioId);

      return regla.categoria_id;
    }
  }

  return null;
}

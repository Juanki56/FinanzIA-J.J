export type TipoMovimientoParseado = 'income' | 'expense';

export interface CorreoParseado {
  tipo: TipoMovimientoParseado;
  monto: number;
  /** Texto a usar como `comercio` del movimiento y como candidato de matching. Puede ser null si no aplica. */
  comercio: string | null;
  descripcion: string;
  /** ISO 8601 completo, ya en UTC. */
  fecha_movimiento: string;
}

// Nota: TODO movimiento creado desde un correo lleva requiere_revision=true y
// estado='pending' sin excepción (lo aplica el servicio de sincronización, no
// cada plantilla) — es una regla general del flujo, no algo que varíe por tipo
// de correo.

/** Las 7 plantillas de Bancolombia capturan exactamente 5 grupos cada una. */
export type Grupos5 = [string, string, string, string, string];

export interface PlantillaBancaria {
  nombre: string;
  regex: RegExp;
  /** Recibe los grupos del match (sin el match completo, index 0) y devuelve el correo interpretado. */
  interpretar: (grupos: Grupos5) => CorreoParseado;
}

export interface RegistroBanco {
  /** Remitente exacto usado para filtrar en Gmail (`from:`). */
  remitente: string;
  plantillas: PlantillaBancaria[];
}

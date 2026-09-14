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

/** La mayoría de las plantillas capturan 5 grupos; alguna necesita 6+. */
export type Grupos5 = [string, string, string, string, string];
export type Grupos6 = [string, string, string, string, string, string];

export interface PlantillaBancaria {
  nombre: string;
  regex: RegExp;
  /**
   * Recibe los grupos del match (sin el match completo, index 0) y devuelve
   * el correo interpretado. Tipado como string[] genérico porque distintas
   * plantillas capturan distinta cantidad de grupos — cada interpretar()
   * castea a la tupla de su propia aridad (Grupos5, Grupos6, etc.) al
   * desestructurar, sabiendo cuántos grupos tiene su propio regex.
   */
  interpretar: (grupos: string[]) => CorreoParseado;
}

export interface RegistroBanco {
  /** Remitente exacto usado para filtrar en Gmail (`from:`). */
  remitente: string;
  plantillas: PlantillaBancaria[];
}

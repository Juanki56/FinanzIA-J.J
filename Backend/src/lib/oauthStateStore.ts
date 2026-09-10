interface EstadoGuardado {
  jwt: string;
  usuarioId: string;
  expiraEn: number;
}

const estados = new Map<string, EstadoGuardado>();
const DURACION_MS = 10 * 60 * 1000; // 10 minutos

export function guardarEstado(state: string, jwt: string, usuarioId: string) {
  estados.set(state, { jwt, usuarioId, expiraEn: Date.now() + DURACION_MS });
}

export function consumirEstado(state: string): EstadoGuardado | null {
  const guardado = estados.get(state);
  estados.delete(state); // de un solo uso, se borre o no sea válido

  if (!guardado || guardado.expiraEn < Date.now()) {
    return null;
  }
  return guardado;
}
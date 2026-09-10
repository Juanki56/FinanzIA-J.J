import type { Request, Response, NextFunction } from 'express';

export function manejadorDeErrores(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error('Error no controlado:', err);

  if (res.headersSent) {
    return;
  }

  res.status(500).json({ error: 'Ocurrió un error inesperado en el servidor' });
}

export function rutaNoEncontrada(_req: Request, res: Response) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}
import type { Request, Response } from 'express';

export function obtenerPerfil(req: Request, res: Response) {
  res.json({ usuario: req.usuario });
}
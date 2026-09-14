import type { Request, Response } from 'express';
import { ejecutarSincronizacionGlobal } from '../cron/sincronizacionCron.js';

/**
 * GET /api/cron/sincronizar — pensado para ser invocado por un scheduler
 * externo (Vercel Cron Jobs u otro), NO por un usuario ni por el frontend.
 *
 * Reutiliza exactamente la misma función que usa el node-cron local
 * (ejecutarSincronizacionGlobal) — no hay dos implementaciones del mismo
 * flujo, solo dos formas distintas de dispararlo según dónde viva el backend:
 * - node-cron en memoria: útil cuando el proceso vive siempre encendido
 *   (tu máquina, Render, Railway).
 *   No sirve en una plataforma serverless como Vercel, que no mantiene
 *   ningún proceso vivo entre peticiones.
 * - Este endpoint + Vercel Cron Jobs (vercel.json): Vercel le pega a esta URL
 *   en el horario configurado. Funciona igual de bien en cualquier lado.
 *
 * Protegido con CRON_SECRET (recomendación oficial de Vercel: variable de
 * entorno + header Authorization: Bearer <CRON_SECRET> que Vercel manda solo).
 * Sin esa variable configurada, el endpoint se niega a correr — nunca queda
 * abierto por accidente.
 */
export async function sincronizarViaCron(req: Request, res: Response) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return res.status(503).json({ error: 'Falta CRON_SECRET en el .env — este endpoint está deshabilitado hasta configurarla.' });
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  await ejecutarSincronizacionGlobal();

  res.json({ ok: true });
}

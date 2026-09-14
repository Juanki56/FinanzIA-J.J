import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sincronizarViaCron } from '../controllers/cron.controller.js';

const router = Router();

// Sin requireAuth a propósito: lo protege CRON_SECRET, no un JWT de usuario
// (quien lo llama es Vercel Cron, no una persona logueada).
router.get('/sincronizar', asyncHandler(sincronizarViaCron));

export default router;

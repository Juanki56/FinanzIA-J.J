import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { responderPregunta, simularGastoFormulario } from '../controllers/asistente.controller.js';

const router = Router();

router.post('/preguntas', requireAuth, asyncHandler(responderPregunta));
router.post('/simulaciones/gasto', requireAuth, asyncHandler(simularGastoFormulario));

export default router;

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { obtenerPerfil, actualizarPerfil } from '../controllers/me.controller.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(obtenerPerfil));
router.patch('/', requireAuth, asyncHandler(actualizarPerfil));

export default router;
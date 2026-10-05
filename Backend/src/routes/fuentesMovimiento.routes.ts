import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { descartarFuente, listarFuentes } from '../controllers/fuentesMovimiento.controller.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(listarFuentes));
router.post('/:id/descartar', requireAuth, asyncHandler(descartarFuente));

export default router;

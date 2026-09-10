import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listarMovimientos, crearMovimiento, actualizarMovimiento, eliminarMovimiento,
} from '../controllers/movimientos.controller.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(listarMovimientos));
router.post('/', requireAuth, asyncHandler(crearMovimiento));
router.patch('/:id', requireAuth, asyncHandler(actualizarMovimiento));
router.delete('/:id', requireAuth, asyncHandler(eliminarMovimiento));

export default router;
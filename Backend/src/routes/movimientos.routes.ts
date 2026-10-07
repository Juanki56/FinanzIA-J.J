import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listarMovimientos, crearMovimiento, actualizarMovimiento, eliminarMovimiento,
  actualizarMovimientosEnLote, sugerirCategoria, listarProcesamientosIA,
} from '../controllers/movimientos.controller.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(listarMovimientos));
router.post('/', requireAuth, asyncHandler(crearMovimiento));
router.post('/lote', requireAuth, asyncHandler(actualizarMovimientosEnLote));
router.patch('/:id', requireAuth, asyncHandler(actualizarMovimiento));
router.delete('/:id', requireAuth, asyncHandler(eliminarMovimiento));
router.post('/:id/sugerir-categoria', requireAuth, asyncHandler(sugerirCategoria));
router.get('/:id/procesamientos-ia', requireAuth, asyncHandler(listarProcesamientosIA));

export default router;
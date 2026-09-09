import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listarMovimientos, crearMovimiento, actualizarMovimiento, eliminarMovimiento,
} from '../controllers/movimientos.controller.js';

const router = Router();

router.get('/', requireAuth, listarMovimientos);
router.post('/', requireAuth, crearMovimiento);
router.patch('/:id', requireAuth, actualizarMovimiento);
router.delete('/:id', requireAuth, eliminarMovimiento);

export default router;
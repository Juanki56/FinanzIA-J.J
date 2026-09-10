import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listarRecurrentes, crearRecurrente, actualizarRecurrente, eliminarRecurrente,
} from '../controllers/transaccionesRecurrentes.controller.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(listarRecurrentes));
router.post('/', requireAuth, asyncHandler(crearRecurrente));
router.patch('/:id', requireAuth, asyncHandler(actualizarRecurrente));
router.delete('/:id', requireAuth, asyncHandler(eliminarRecurrente));

export default router;
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listarTransferencias, crearTransferencia, actualizarEstadoTransferencia,
} from '../controllers/transferencias.controller.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(listarTransferencias));
router.post('/', requireAuth, asyncHandler(crearTransferencia));
router.patch('/:id/estado', requireAuth, asyncHandler(actualizarEstadoTransferencia));

export default router;
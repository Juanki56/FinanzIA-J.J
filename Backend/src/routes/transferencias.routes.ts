import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listarTransferencias, crearTransferencia, actualizarEstadoTransferencia,
} from '../controllers/transferencias.controller.js';

const router = Router();

router.get('/', requireAuth, listarTransferencias);
router.post('/', requireAuth, crearTransferencia);
router.patch('/:id/estado', requireAuth, actualizarEstadoTransferencia);

export default router;
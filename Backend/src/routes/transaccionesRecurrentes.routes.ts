import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listarRecurrentes, crearRecurrente, actualizarRecurrente, eliminarRecurrente,
} from '../controllers/transaccionesRecurrentes.controller.js';

const router = Router();

router.get('/', requireAuth, listarRecurrentes);
router.post('/', requireAuth, crearRecurrente);
router.patch('/:id', requireAuth, actualizarRecurrente);
router.delete('/:id', requireAuth, eliminarRecurrente);

export default router;
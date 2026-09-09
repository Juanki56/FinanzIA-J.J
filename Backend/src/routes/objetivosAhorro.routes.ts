import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listarObjetivos, crearObjetivo, actualizarObjetivo, eliminarObjetivo,
  listarAsignaciones, crearAsignacion, eliminarAsignacion,
} from '../controllers/objetivosAhorro.controller.js';

const router = Router();

router.get('/', requireAuth, listarObjetivos);
router.post('/', requireAuth, crearObjetivo);
router.patch('/:id', requireAuth, actualizarObjetivo);
router.delete('/:id', requireAuth, eliminarObjetivo);

router.get('/:id/asignaciones', requireAuth, listarAsignaciones);
router.post('/:id/asignaciones', requireAuth, crearAsignacion);
router.delete('/:id/asignaciones/:asignacionId', requireAuth, eliminarAsignacion);

export default router;
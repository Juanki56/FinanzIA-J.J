import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listarObjetivos, crearObjetivo, actualizarObjetivo, eliminarObjetivo,
  listarAsignaciones, crearAsignacion, eliminarAsignacion, actualizarAsignacion
} from '../controllers/objetivosAhorro.controller.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(listarObjetivos));
router.post('/', requireAuth, asyncHandler(crearObjetivo));
router.patch('/:id', requireAuth, asyncHandler(actualizarObjetivo));
router.delete('/:id', requireAuth, asyncHandler(eliminarObjetivo));

router.get('/:id/asignaciones', requireAuth, asyncHandler(listarAsignaciones));
router.post('/:id/asignaciones', requireAuth, asyncHandler(crearAsignacion));
router.delete('/:id/asignaciones/:asignacionId', requireAuth, asyncHandler(eliminarAsignacion));
router.patch('/:id/asignaciones/:asignacionId', requireAuth, asyncHandler(actualizarAsignacion));

export default router;
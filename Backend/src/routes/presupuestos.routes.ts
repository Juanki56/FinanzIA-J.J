import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listarPresupuestos, crearPresupuesto, actualizarPresupuesto, eliminarPresupuesto,
} from '../controllers/presupuestos.controller.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(listarPresupuestos));
router.post('/', requireAuth, asyncHandler(crearPresupuesto));
router.patch('/:id', requireAuth, asyncHandler(actualizarPresupuesto));
router.delete('/:id', requireAuth, asyncHandler(eliminarPresupuesto));

export default router;
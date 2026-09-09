import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listarPresupuestos, crearPresupuesto, actualizarPresupuesto, eliminarPresupuesto,
} from '../controllers/presupuestos.controller.js';

const router = Router();

router.get('/', requireAuth, listarPresupuestos);
router.post('/', requireAuth, crearPresupuesto);
router.patch('/:id', requireAuth, actualizarPresupuesto);
router.delete('/:id', requireAuth, eliminarPresupuesto);

export default router;
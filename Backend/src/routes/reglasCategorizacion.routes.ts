import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listarReglas, crearRegla, actualizarRegla, eliminarRegla,
} from '../controllers/reglasCategorizacion.controller.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(listarReglas));
router.post('/', requireAuth, asyncHandler(crearRegla));
router.patch('/:id', requireAuth, asyncHandler(actualizarRegla));
router.delete('/:id', requireAuth, asyncHandler(eliminarRegla));

export default router;

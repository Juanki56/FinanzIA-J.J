import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listarCategorias, crearCategoria, actualizarCategoria, eliminarCategoria,
} from '../controllers/categorias.controller.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(listarCategorias));
router.post('/', requireAuth, asyncHandler(crearCategoria));
router.patch('/:id', requireAuth, asyncHandler(actualizarCategoria));
router.delete('/:id', requireAuth, asyncHandler(eliminarCategoria));

export default router;
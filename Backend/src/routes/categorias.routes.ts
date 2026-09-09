import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listarCategorias, crearCategoria, actualizarCategoria, eliminarCategoria,
} from '../controllers/categorias.controller.js';

const router = Router();

router.get('/', requireAuth, listarCategorias);
router.post('/', requireAuth, crearCategoria);
router.patch('/:id', requireAuth, actualizarCategoria);
router.delete('/:id', requireAuth, eliminarCategoria);

export default router;
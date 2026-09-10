import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  iniciarConexionGoogle, callbackGoogle, listarConexiones, eliminarConexion,
} from '../controllers/conexiones.controller.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(listarConexiones));
router.get('/google', requireAuth, asyncHandler(iniciarConexionGoogle));
router.get('/google/callback', asyncHandler(callbackGoogle)); // sin requireAuth a propósito
router.delete('/:id', requireAuth, asyncHandler(eliminarConexion));

export default router;
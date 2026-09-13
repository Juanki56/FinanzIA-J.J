import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  iniciarConexionGoogle, callbackGoogle, listarConexiones, eliminarConexion,
  actualizarConexion, sincronizarConexionManual,
} from '../controllers/conexiones.controller.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(listarConexiones));
router.get('/google', requireAuth, asyncHandler(iniciarConexionGoogle));
router.get('/google/callback', asyncHandler(callbackGoogle)); // sin requireAuth a propósito
router.patch('/:id', requireAuth, asyncHandler(actualizarConexion));
router.delete('/:id', requireAuth, asyncHandler(eliminarConexion));
router.post('/:id/sincronizar', requireAuth, asyncHandler(sincronizarConexionManual));

export default router;
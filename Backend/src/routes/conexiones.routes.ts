import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  iniciarConexionGoogle, completarConexionGoogle, listarConexiones, eliminarConexion,
  actualizarConexion, sincronizarConexionManual,
} from '../controllers/conexiones.controller.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(listarConexiones));
router.get('/google', requireAuth, asyncHandler(iniciarConexionGoogle));
// Autenticado (a diferencia del viejo callback GET): el FRONTEND llama esto
// con el JWT normal del usuario después de que Google lo redirige A ÉL, no al backend.
router.post('/google/callback', requireAuth, asyncHandler(completarConexionGoogle));
router.patch('/:id', requireAuth, asyncHandler(actualizarConexion));
router.delete('/:id', requireAuth, asyncHandler(eliminarConexion));
router.post('/:id/sincronizar', requireAuth, asyncHandler(sincronizarConexionManual));

export default router;
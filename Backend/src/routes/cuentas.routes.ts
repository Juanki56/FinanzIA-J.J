import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { listarCuentas, crearCuenta, actualizarCuenta, ajustarSaldoCuenta } from '../controllers/cuentas.controller.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(listarCuentas));
router.post('/', requireAuth, asyncHandler(crearCuenta));
router.patch('/:id', requireAuth, asyncHandler(actualizarCuenta));
router.post('/:id/ajustar-saldo', requireAuth, asyncHandler(ajustarSaldoCuenta));

export default router;
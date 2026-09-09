import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listarCuentas, crearCuenta, actualizarCuenta } from '../controllers/cuentas.controller.js';

const router = Router();

router.get('/', requireAuth, listarCuentas);
router.post('/', requireAuth, crearCuenta);
router.patch('/:id', requireAuth, actualizarCuenta);

export default router;
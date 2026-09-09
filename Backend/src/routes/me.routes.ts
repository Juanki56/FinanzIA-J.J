import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { obtenerPerfil } from '../controllers/me.controller.js';

const router = Router();

router.get('/', requireAuth, obtenerPerfil);

export default router;
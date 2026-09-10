import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { manejadorDeErrores, rutaNoEncontrada } from './middleware/errorHandler.js';
import meRoutes from './routes/me.routes.js';
import conexionesRoutes from './routes/conexiones.routes.js';
import cuentasRoutes from './routes/cuentas.routes.js';
import movimientosRoutes from './routes/movimientos.routes.js';
import transferenciasRoutes from './routes/transferencias.routes.js';
import categoriasRoutes from './routes/categorias.routes.js';
import presupuestosRoutes from './routes/presupuestos.routes.js'
import objetivosAhorroRoutes from './routes/objetivosAhorro.routes.js';;
import transaccionesRecurrentesRoutes from './routes/transaccionesRecurrentes.routes.js';
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'FinanzIA backend funcionando 🚀',
  });
});

app.use('/api/me', meRoutes);
app.use('/api/cuentas', cuentasRoutes);
app.use('/api/movimientos', movimientosRoutes);
app.use('/api/transferencias', transferenciasRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/presupuestos', presupuestosRoutes);
app.use('/api/objetivos-ahorro', objetivosAhorroRoutes);
app.use('/api/transacciones-recurrentes', transaccionesRecurrentesRoutes);

app.use('/api/conexiones', conexionesRoutes);






app.use(rutaNoEncontrada);
app.use(manejadorDeErrores);
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});
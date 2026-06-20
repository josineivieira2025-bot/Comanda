import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import tableRoutes from './routes/tables.js';
import orderRoutes from './routes/orders.js';
import catalogRoutes from './routes/catalog.js';
import stockRoutes from './routes/stock.js';
import customerRoutes from './routes/customers.js';
import financeRoutes from './routes/finance.js';
import settingsRoutes from './routes/settings.js';
import serviceCallRoutes from './routes/serviceCalls.js';
import publicRoutes from './routes/public.js';

export function createApp() {
  const app = express();
  app.use(cors({ origin: (process.env.FRONTEND_URL || 'http://localhost:5173').split(','), credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'orbe-api', time: new Date() }));
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/tables', tableRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/catalog', catalogRoutes);
  app.use('/api/stock', stockRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/finance', financeRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/service-calls', serviceCallRoutes);
  app.use('/api/public', publicRoutes);
  app.use((err, _req, res, _next) => {
    console.error(err);
    if (err?.name === 'ZodError') return res.status(400).json({ message: 'Dados inválidos', issues: err.issues });
    if (err?.code === 'P2002') return res.status(409).json({ message: 'Registro duplicado' });
    res.status(err.status || 500).json({ message: err.message || 'Erro interno do servidor' });
  });
  return app;
}

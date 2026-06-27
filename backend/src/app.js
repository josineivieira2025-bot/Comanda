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
import commandCardRoutes from './routes/commandCards.js';
import integrationsRoutes from './routes/integrations.js';
import { auth, moduleAccess } from './middleware/auth.js';

export function createApp() {
  const app = express();
  app.use(cors({ origin: (process.env.FRONTEND_URL || 'http://localhost:5173').split(','), credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'orbe-api', time: new Date() }));
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/tables', tableRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/catalog', auth, moduleAccess(['menu.view', 'orders.view', 'orders.edit', 'dashboard.view', 'reports.view'], 'menu.edit'), catalogRoutes);
  app.use('/api/stock', auth, moduleAccess(['stock.view', 'dashboard.view'], 'stock.edit'), stockRoutes);
  app.use('/api/customers', auth, moduleAccess(['customers.view', 'orders.edit', 'reports.view'], 'customers.edit'), customerRoutes);
  app.use('/api/finance', financeRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/integrations', integrationsRoutes);
  app.use('/api/service-calls', serviceCallRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/command-cards', commandCardRoutes);
  app.use((err, _req, res, _next) => {
    console.error(err);
    if (err?.name === 'ZodError') return res.status(400).json({ message: 'Dados inválidos', issues: err.issues });
    if (err?.code === 'P2002') return res.status(409).json({ message: 'Registro duplicado' });
    res.status(err.status || 500).json({ message: err.message || 'Erro interno do servidor' });
  });
  return app;
}

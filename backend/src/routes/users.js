import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError, publicUser } from '../lib/http.js';
import { auth, roles } from '../middleware/auth.js';

const router = Router();
router.use(auth, roles('ADMIN'));

const allowedPermissions = ['dashboard.view', 'dashboard.edit', 'tables.view', 'tables.edit', 'kds.view', 'kds.edit', 'orders.view', 'orders.edit', 'stock.view', 'stock.edit', 'finance.view', 'finance.edit', 'customers.view', 'customers.edit', 'menu.view', 'menu.edit', 'reports.view', 'reports.edit', 'settings.view', 'settings.edit'];
const input = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum(['MANAGER', 'WAITER', 'KITCHEN', 'CASHIER']),
  permissions: z.array(z.enum(allowedPermissions)),
  active: z.boolean()
});

router.get('/', asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({ where: { restaurantId: req.user.restaurantId }, orderBy: { name: 'asc' } });
  res.json(users.map(publicUser));
}));

router.post('/', asyncHandler(async (req, res) => {
  const body = input.extend({ password: z.string().min(6) }).parse(req.body);
  if (await prisma.user.findUnique({ where: { email: body.email } })) throw new HttpError(409, 'E-mail já cadastrado');
  const user = await prisma.user.create({ data: { restaurantId: req.user.restaurantId, name: body.name, email: body.email, passwordHash: await bcrypt.hash(body.password, 12), role: body.role, permissions: body.permissions, active: body.active } });
  res.status(201).json(publicUser(user));
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const current = await prisma.user.findFirst({ where: { id: req.params.id, restaurantId: req.user.restaurantId } });
  if (!current) throw new HttpError(404, 'Usuário não encontrado');
  if (current.role === 'ADMIN') throw new HttpError(409, 'O administrador principal não pode ser alterado por esta tela');
  const body = input.partial().parse(req.body);
  if (body.email && body.email !== current.email && await prisma.user.findUnique({ where: { email: body.email } })) throw new HttpError(409, 'E-mail já cadastrado');
  const data = { ...body };
  if (body.password) data.passwordHash = await bcrypt.hash(body.password, 12);
  delete data.password;
  const user = await prisma.user.update({ where: { id: current.id }, data });
  res.json(publicUser(user));
}));

export default router;

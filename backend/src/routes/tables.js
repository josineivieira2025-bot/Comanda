import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError } from '../lib/http.js';
import { auth, roles } from '../middleware/auth.js';

const router = Router();
router.use(auth);
const include = { calls: { where: { status: 'OPEN' }, orderBy: { createdAt: 'asc' } }, tabs: { where: { status: 'OPEN' }, include: { customer: true, waiter: { select: { id: true, name: true } }, orders: { where: { status: { not: 'CANCELLED' } }, include: { items: true } } } } };
const tableInput = z.object({ number: z.coerce.string().trim().min(1), seats: z.coerce.number().int().min(1).max(50), status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'ATTENTION']).optional(), note: z.string().trim().max(240).optional().nullable() });

router.get('/', asyncHandler(async (req, res) => {
  res.json(await prisma.restaurantTable.findMany({ where: { restaurantId: req.user.restaurantId }, include, orderBy: { number: 'asc' } }));
}));

router.post('/', roles('ADMIN', 'MANAGER'), asyncHandler(async (req, res) => {
  const body = tableInput.parse(req.body);
  const table = await prisma.restaurantTable.create({ data: { restaurantId: req.user.restaurantId, ...body, status: body.status || 'AVAILABLE', note: body.note || null } });
  req.app.locals.io.to(req.user.restaurantId).emit('table:changed', table);
  res.status(201).json(table);
}));

router.put('/:id', roles('ADMIN', 'MANAGER'), asyncHandler(async (req, res) => {
  const current = await prisma.restaurantTable.findFirst({ where: { id: req.params.id, restaurantId: req.user.restaurantId } });
  if (!current) throw new HttpError(404, 'Mesa não encontrada');
  const body = tableInput.partial().parse(req.body);
  const table = await prisma.restaurantTable.update({ where: { id: current.id }, data: body });
  req.app.locals.io.to(req.user.restaurantId).emit('table:changed', table);
  res.json(table);
}));

router.delete('/:id', roles('ADMIN', 'MANAGER'), asyncHandler(async (req, res) => {
  if (await prisma.tab.count({ where: { tableId: req.params.id } })) throw new HttpError(409, 'A mesa possui histórico e não pode ser excluída');
  await prisma.restaurantTable.deleteMany({ where: { id: req.params.id, restaurantId: req.user.restaurantId } });
  req.app.locals.io.to(req.user.restaurantId).emit('table:deleted', { id: req.params.id });
  res.status(204).end();
}));

router.post('/:id/open', asyncHandler(async (req, res) => {
  const table = await prisma.restaurantTable.findFirst({ where: { id: req.params.id, restaurantId: req.user.restaurantId } });
  if (!table) throw new HttpError(404, 'Mesa não encontrada');
  const body = z.object({ customerId: z.string().optional().nullable(), forceNew: z.boolean().optional() }).parse(req.body);
  const existing = body.forceNew ? null : await prisma.tab.findFirst({ where: { tableId: table.id, status: 'OPEN', ...(body.customerId ? { customerId: body.customerId } : {}) }, include: { customer: true, orders: { include: { items: true } } } });
  if (existing) return res.json(existing);
  const tab = await prisma.$transaction(async tx => {
    await tx.restaurantTable.update({ where: { id: table.id }, data: { status: 'OCCUPIED' } });
    return tx.tab.create({ data: { restaurantId: req.user.restaurantId, tableId: table.id, customerId: body.customerId || null, waiterId: req.user.id }, include: { table: true, customer: true, orders: true } });
  });
  req.app.locals.io.to(req.user.restaurantId).emit('tab:opened', tab);
  res.status(201).json(tab);
}));

router.post('/:id/close', asyncHandler(async (req, res) => {
  throw new HttpError(409, 'A mesa só pode ser liberada após o pagamento no Financeiro');
}));

export default router;

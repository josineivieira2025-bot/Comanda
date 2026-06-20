import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError } from '../lib/http.js';

const router = Router();
router.get('/menu/:restaurantSlug', asyncHandler(async (req, res) => { const restaurant = await prisma.restaurant.findUnique({ where: { slug: req.params.restaurantSlug }, select: { id: true, name: true, slug: true, city: true, products: { where: { available: true }, include: { category: true }, orderBy: { name: 'asc' } } } }); if (!restaurant) throw new HttpError(404, 'Restaurante não encontrado'); res.json(restaurant); }));
router.get('/table/:id', asyncHandler(async (req, res) => { const table = await prisma.restaurantTable.findUnique({ where: { id: req.params.id }, include: { restaurant: { select: { id: true, name: true, slug: true, serviceFee: true } }, tabs: { where: { status: 'OPEN' }, include: { orders: { where: { status: { not: 'CANCELLED' } }, include: { items: { include: { product: true } } } } } } } }); if (!table) throw new HttpError(404, 'Mesa não encontrada'); const products = await prisma.product.findMany({ where: { restaurantId: table.restaurantId, available: true }, include: { category: true }, orderBy: { name: 'asc' } }); res.json({ ...table, products }); }));
router.post('/table/:id/order', asyncHandler(async (req, res) => {
  const body = z.object({ note: z.string().trim().max(300).optional(), items: z.array(z.object({ productId: z.string(), quantity: z.coerce.number().int().positive().max(50), note: z.string().trim().max(200).optional() })).min(1).max(50) }).parse(req.body);
  const table = await prisma.restaurantTable.findUnique({ where: { id: req.params.id } }); if (!table) throw new HttpError(404, 'Mesa não encontrada');
  let tab = await prisma.tab.findFirst({ where: { tableId: table.id, status: 'OPEN' } });
  if (!tab) tab = await prisma.$transaction(async tx => { await tx.restaurantTable.update({ where: { id: table.id }, data: { status: 'OCCUPIED' } }); return tx.tab.create({ data: { restaurantId: table.restaurantId, tableId: table.id } }); });
  const ids = body.items.map(item => item.productId); const products = await prisma.product.findMany({ where: { id: { in: ids }, restaurantId: table.restaurantId, available: true } }); if (products.length !== new Set(ids).size) throw new HttpError(400, 'Produto inválido ou indisponível');
  const order = await prisma.order.create({ data: { tabId: tab.id, note: body.note, items: { create: body.items.map(item => ({ productId: item.productId, quantity: item.quantity, note: item.note, unitPrice: products.find(product => product.id === item.productId).price })) } }, include: { tab: { include: { table: true } }, items: { include: { product: { include: { category: true } } } } } });
  req.app.locals.io.to(table.restaurantId).emit('order:created', order); res.status(201).json(order);
}));
router.post('/table/:id/call', asyncHandler(async (req, res) => {
  const table = await prisma.restaurantTable.findUnique({ where: { id: req.params.id } }); if (!table) throw new HttpError(404, 'Mesa não encontrada');
  const type = ['WAITER', 'BILL'].includes(req.body.type) ? req.body.type : 'WAITER';
  const existing = await prisma.serviceCall.findFirst({ where: { tableId: table.id, type, status: 'OPEN' } }); if (existing) return res.json(existing);
  const call = await prisma.$transaction(async tx => { await tx.restaurantTable.update({ where: { id: table.id }, data: { status: 'ATTENTION' } }); return tx.serviceCall.create({ data: { tableId: table.id, type } }); });
  req.app.locals.io.to(table.restaurantId).emit('service:called', { ...call, table }); res.status(201).json(call);
}));
export default router;

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError } from '../lib/http.js';
import { auth, roles } from '../middleware/auth.js';

const router = Router();
router.use(auth);
const sector = z.enum(['KITCHEN', 'BAR', 'GRILL', 'DESSERT']);
const productInput = z.object({ name: z.string().trim().min(2), description: z.string().trim().max(500).optional().nullable(), price: z.coerce.number().nonnegative(), imageUrl: z.string().url().optional().or(z.literal('')).nullable(), available: z.boolean().optional(), categoryId: z.string().optional(), category: z.string().trim().min(2).optional(), sector: sector.optional() });

async function resolveCategory(restaurantId, body) {
  if (body.categoryId) {
    const category = await prisma.category.findFirst({ where: { id: body.categoryId, restaurantId } });
    if (category && (!body.category || category.name === body.category)) return category.id;
  }
  const name = body.category || 'Geral';
  const category = await prisma.category.upsert({ where: { restaurantId_name: { restaurantId, name } }, update: { sector: body.sector || undefined }, create: { restaurantId, name, sector: body.sector || 'KITCHEN' } });
  return category.id;
}

router.get('/categories', asyncHandler(async (req, res) => res.json(await prisma.category.findMany({ where: { restaurantId: req.user.restaurantId }, orderBy: { name: 'asc' } }))));
router.post('/categories', roles('ADMIN', 'MANAGER'), asyncHandler(async (req, res) => { const body = z.object({ name: z.string().trim().min(2), sector: sector.optional() }).parse(req.body); res.status(201).json(await prisma.category.create({ data: { restaurantId: req.user.restaurantId, name: body.name, sector: body.sector || 'KITCHEN' } })); }));
router.get('/products', asyncHandler(async (req, res) => res.json(await prisma.product.findMany({ where: { restaurantId: req.user.restaurantId }, include: { category: true }, orderBy: { name: 'asc' } }))));
router.post('/products', roles('ADMIN', 'MANAGER'), asyncHandler(async (req, res) => { const body = productInput.parse(req.body); const categoryId = await resolveCategory(req.user.restaurantId, body); res.status(201).json(await prisma.product.create({ data: { restaurantId: req.user.restaurantId, categoryId, name: body.name, description: body.description || null, price: body.price, imageUrl: body.imageUrl || null, available: body.available ?? true }, include: { category: true } })); }));
router.put('/products/:id', roles('ADMIN', 'MANAGER'), asyncHandler(async (req, res) => { const current = await prisma.product.findFirst({ where: { id: req.params.id, restaurantId: req.user.restaurantId } }); if (!current) throw new HttpError(404, 'Produto não encontrado'); const body = productInput.partial().parse(req.body); const categoryId = body.category || body.categoryId ? await resolveCategory(req.user.restaurantId, body) : undefined; res.json(await prisma.product.update({ where: { id: current.id }, data: { categoryId, name: body.name, description: body.description, price: body.price, imageUrl: body.imageUrl === '' ? null : body.imageUrl, available: body.available }, include: { category: true } })); }));
router.delete('/products/:id', roles('ADMIN', 'MANAGER'), asyncHandler(async (req, res) => { const product = await prisma.product.findFirst({ where: { id: req.params.id, restaurantId: req.user.restaurantId } }); if (!product) throw new HttpError(404, 'Produto não encontrado'); if (await prisma.orderItem.count({ where: { productId: product.id } })) throw new HttpError(409, 'Produto possui histórico; marque-o como indisponível'); await prisma.product.delete({ where: { id: product.id } }); res.status(204).end(); }));

export default router;

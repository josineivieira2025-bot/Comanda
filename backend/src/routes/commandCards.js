import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError } from '../lib/http.js';
import { auth, permit } from '../middleware/auth.js';

const router = Router();
router.use(auth);

const include = {
  tabs: {
    where: { status: 'OPEN' },
    take: 1,
    include: {
      table: { select: { id: true, number: true } },
      customer: { select: { id: true, name: true } },
      orders: { where: { status: { not: 'CANCELLED' } }, include: { items: true } }
    }
  }
};

router.get('/', permit('tables.view', 'orders.edit'), asyncHandler(async (req, res) => {
  res.json(await prisma.commandCard.findMany({ where: { restaurantId: req.user.restaurantId }, include, orderBy: { number: 'asc' } }));
}));

router.post('/', permit('tables.edit'), asyncHandler(async (req, res) => {
  const body = z.object({ start: z.coerce.number().int().min(1).max(9999), end: z.coerce.number().int().min(1).max(9999) }).parse(req.body);
  if (body.end < body.start) throw new HttpError(400, 'O número final deve ser maior que o inicial');
  if (body.end - body.start > 999) throw new HttpError(400, 'Cadastre no máximo 1.000 comandas por vez');
  const numbers = Array.from({ length: body.end - body.start + 1 }, (_, index) => body.start + index);
  await prisma.commandCard.createMany({ data: numbers.map(number => ({ restaurantId: req.user.restaurantId, number })), skipDuplicates: true });
  const cards = await prisma.commandCard.findMany({ where: { restaurantId: req.user.restaurantId, number: { in: numbers } }, include, orderBy: { number: 'asc' } });
  req.app.locals.io.to(req.user.restaurantId).emit('command-cards:changed');
  res.status(201).json(cards);
}));

router.patch('/:id', permit('tables.edit'), asyncHandler(async (req, res) => {
  const card = await prisma.commandCard.findFirst({ where: { id: req.params.id, restaurantId: req.user.restaurantId }, include });
  if (!card) throw new HttpError(404, 'Comanda não encontrada');
  const active = z.object({ active: z.boolean() }).parse(req.body).active;
  if (!active && card.tabs.length) throw new HttpError(409, 'A comanda está em uso e não pode ser desativada');
  const updated = await prisma.commandCard.update({ where: { id: card.id }, data: { active }, include });
  req.app.locals.io.to(req.user.restaurantId).emit('command-cards:changed');
  res.json(updated);
}));

export default router;

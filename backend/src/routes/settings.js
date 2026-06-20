import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError } from '../lib/http.js';
import { auth, permit } from '../middleware/auth.js';

const router = Router();
router.use(auth);

router.get('/', asyncHandler(async (req, res) => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: req.user.restaurantId },
    select: { id: true, name: true, slug: true, city: true, serviceFee: true }
  });
  if (!restaurant) throw new HttpError(404, 'Restaurante não encontrado');
  res.json(restaurant);
}));

router.put('/', permit('settings.edit'), asyncHandler(async (req, res) => {
  const body = z.object({
    name: z.string().trim().min(2),
    city: z.string().trim().max(120).optional().nullable(),
    serviceFee: z.coerce.number().min(0).max(30)
  }).parse(req.body);
  res.json(await prisma.restaurant.update({
    where: { id: req.user.restaurantId },
    data: { name: body.name, city: body.city || null, serviceFee: body.serviceFee },
    select: { id: true, name: true, slug: true, city: true, serviceFee: true }
  }));
}));

export default router;

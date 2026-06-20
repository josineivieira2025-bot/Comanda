import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError } from '../lib/http.js';
import { auth } from '../middleware/auth.js';

const router = Router();
router.use(auth);
router.get('/', asyncHandler(async (req, res) => {
  const calls = await prisma.serviceCall.findMany({
    where: { table: { restaurantId: req.user.restaurantId }, status: 'OPEN' },
    include: { table: true },
    orderBy: { createdAt: 'asc' }
  });
  res.json(calls);
}));
router.patch('/:id/resolve', asyncHandler(async (req, res) => {
  const call = await prisma.serviceCall.findFirst({
    where: { id: req.params.id, table: { restaurantId: req.user.restaurantId }, status: 'OPEN' },
    include: {
      table: {
        include: { tabs: { where: { status: 'OPEN' }, select: { id: true } } }
      }
    }
  });
  if (!call) throw new HttpError(404, 'Chamado não encontrado');
  const result = await prisma.$transaction(async tx => {
    const resolved = await tx.serviceCall.update({ where: { id: call.id }, data: { status: 'RESOLVED', resolvedAt: new Date() } });
    const remaining = await tx.serviceCall.count({ where: { tableId: call.tableId, status: 'OPEN' } });
    if (!remaining) await tx.restaurantTable.update({ where: { id: call.tableId }, data: { status: call.table.tabs.length ? 'OCCUPIED' : 'AVAILABLE' } });
    return resolved;
  });
  req.app.locals.io.to(req.user.restaurantId).emit('service:resolved', result);
  res.json(result);
}));
export default router;

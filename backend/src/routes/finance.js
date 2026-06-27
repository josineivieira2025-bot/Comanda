import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError } from '../lib/http.js';
import { auth, permit } from '../middleware/auth.js';
import { createFiscalDocumentForPayment, emitFiscalDocument } from '../lib/fiscal.js';
import { buildPixCode } from '../lib/pix.js';

const router = Router();
router.use(auth);
const financeView = permit('finance.view', 'dashboard.view');
const financeEdit = permit('finance.edit');
const cashierRoles = financeEdit;
const methods = ['CASH', 'PIX', 'CARD', 'VOUCHER'];

router.get('/summary', financeView, asyncHandler(async (req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [session, payments, restaurant, openTabs] = await Promise.all([
    prisma.cashSession.findFirst({ where: { restaurantId: req.user.restaurantId, status: 'OPEN' } }),
    prisma.payment.findMany({ where: { restaurantId: req.user.restaurantId, createdAt: { gte: start } }, orderBy: { createdAt: 'desc' } }),
    prisma.restaurant.findUnique({ where: { id: req.user.restaurantId }, select: { serviceFee: true } }),
    prisma.tab.findMany({ where: { restaurantId: req.user.restaurantId, status: 'OPEN' }, include: { table: { select: { id: true, number: true } }, customer: { select: { id: true, name: true } }, orders: { where: { status: { not: 'CANCELLED' } }, include: { items: { include: { product: { select: { id: true, name: true } } } } } } }, orderBy: { openedAt: 'asc' } })
  ]);
  const feePercent = Number(restaurant?.serviceFee ?? 10);
  const receivables = openTabs.filter(tab => tab.orders.length > 0 && tab.orders.every(order => order.status === 'DELIVERED')).map(tab => {
    const subtotal = tab.orders.flatMap(order => order.items).reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
    const serviceFee = subtotal * feePercent / 100;
    const items = tab.orders.flatMap(order => order.items.map(item => ({ id: item.id, productId: item.productId, name: item.product.name, quantity: item.quantity, unitPrice: Number(item.unitPrice), total: Number(item.unitPrice) * item.quantity })));
    return { id: tab.id, number: tab.number, table: tab.table, customer: tab.customer, openedAt: tab.openedAt, subtotal, serviceFee, total: subtotal + serviceFee, orderCount: tab.orders.length, items };
  });
  const total = payments.reduce((sum, payment) => sum + (payment.type === 'WITHDRAWAL' ? -1 : 1) * Number(payment.amount), 0);
  res.json({ session, payments, receivables, total, byMethod: Object.fromEntries(methods.map(method => [method, payments.filter(payment => payment.method === method && payment.type === 'SALE').reduce((sum, payment) => sum + Number(payment.amount), 0)])) });
}));

router.get('/receivables/:tabId/pix', financeEdit, asyncHandler(async (req, res) => {
  const tab = await prisma.tab.findFirst({ where: { id: req.params.tabId, restaurantId: req.user.restaurantId, status: 'OPEN' }, include: { orders: { where: { status: { not: 'CANCELLED' } }, include: { items: true } }, table: true } });
  if (!tab) throw new HttpError(404, 'Comanda pendente nao encontrada');
  const settings = await prisma.fiscalSettings.findUnique({ where: { restaurantId: req.user.restaurantId } });
  if (!settings?.pixKey) throw new HttpError(409, 'Configure a chave PIX em Configuracoes > Nota fiscal e cupom');
  const restaurant = await prisma.restaurant.findUnique({ where: { id: req.user.restaurantId }, select: { serviceFee: true, name: true, city: true } });
  const subtotal = tab.orders.flatMap(order => order.items).reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
  const serviceFee = subtotal * Number(restaurant?.serviceFee ?? 10) / 100;
  const total = subtotal + serviceFee;
  const txid = `CMD${tab.number}`;
  const pixCode = buildPixCode({
    pixKey: settings.pixKey,
    merchantName: settings.pixMerchantName || settings.tradeName || restaurant?.name,
    merchantCity: settings.pixMerchantCity || settings.city || restaurant?.city,
    amount: total,
    txid,
    description: `Comanda ${tab.number}`
  });
  res.json({ pixCode, amount: total, txid });
}));

router.post('/receivables/:tabId/pay', financeEdit, asyncHandler(async (req, res) => {
  const body = z.object({
    method: z.enum(['CASH', 'PIX', 'CARD', 'VOUCHER']),
    pixCode: z.string().optional().nullable(),
    cardBrand: z.string().optional().nullable(),
    cardAuthorization: z.string().optional().nullable(),
    installments: z.coerce.number().int().positive().optional().nullable(),
    cashReceived: z.coerce.number().optional().nullable()
  }).parse(req.body);
  const tab = await prisma.tab.findFirst({ where: { id: req.params.tabId, restaurantId: req.user.restaurantId, status: 'OPEN' }, include: { orders: { where: { status: { not: 'CANCELLED' } }, include: { items: true } }, table: true, customer: true } });
  if (!tab) throw new HttpError(404, 'Comanda pendente não encontrada');
  if (!tab.orders.length || !tab.orders.every(order => order.status === 'DELIVERED')) throw new HttpError(409, 'Todos os pedidos precisam estar entregues antes do pagamento');
  const session = await prisma.cashSession.findFirst({ where: { restaurantId: req.user.restaurantId, status: 'OPEN' } });
  if (!session) throw new HttpError(409, 'Abra o caixa antes de receber o pagamento');
  const restaurant = await prisma.restaurant.findUnique({ where: { id: req.user.restaurantId }, select: { serviceFee: true } });
  const subtotal = tab.orders.flatMap(order => order.items).reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
  const serviceFee = subtotal * Number(restaurant?.serviceFee ?? 10) / 100;
  const total = subtotal + serviceFee;
  const result = await prisma.$transaction(async tx => {
    const closed = await tx.tab.updateMany({ where: { id: tab.id, status: 'OPEN' }, data: { status: 'CLOSED', subtotal, serviceFee, total, closedAt: new Date() } });
    if (closed.count !== 1) throw new HttpError(409, 'Esta comanda já foi recebida');
    const payment = await tx.payment.create({
      data: {
        restaurantId: req.user.restaurantId,
        tabId: tab.id,
        cashSessionId: session.id,
        userId: req.user.id,
        type: 'SALE',
        method: body.method,
        amount: total,
        description: `Comanda #${tab.number} · Mesa ${tab.table.number}`,
        pixCode: body.method === 'PIX' ? body.pixCode : null,
        cardBrand: body.method === 'CARD' ? body.cardBrand : null,
        cardAuthorization: body.method === 'CARD' ? body.cardAuthorization : null,
        installments: body.method === 'CARD' ? body.installments || 1 : null,
        cashReceived: body.method === 'CASH' ? body.cashReceived || total : null,
        changeAmount: body.method === 'CASH' ? Math.max(0, Number(body.cashReceived || total) - total) : null
      }
    });
    const fiscalDocument = await createFiscalDocumentForPayment(tx, { restaurantId: req.user.restaurantId, payment, tabId: tab.id, amount: total, customerCpf: tab.customer?.cpf || null });
    const remainingTabs = await tx.tab.count({ where: { tableId: tab.tableId, status: 'OPEN' } });
    await tx.restaurantTable.update({ where: { id: tab.tableId }, data: { status: remainingTabs ? 'OCCUPIED' : 'AVAILABLE' } });
    if (!remainingTabs) await tx.serviceCall.updateMany({ where: { tableId: tab.tableId, status: 'OPEN' }, data: { status: 'RESOLVED', resolvedAt: new Date() } });
    return { payment, fiscalDocument };
  });
  if (result.fiscalDocument?.status === 'PENDING') await emitFiscalDocument(prisma, result.fiscalDocument.id);
  req.app.locals.io.to(req.user.restaurantId).emit('tab:closed', { id: tab.id, tableId: tab.tableId });
  res.status(201).json(result.payment);
}));

router.post('/cash/open', cashierRoles, asyncHandler(async (req, res) => { if (await prisma.cashSession.findFirst({ where: { restaurantId: req.user.restaurantId, status: 'OPEN' } })) throw new HttpError(409, 'Já existe um caixa aberto'); res.status(201).json(await prisma.cashSession.create({ data: { restaurantId: req.user.restaurantId, openedById: req.user.id, openingAmount: Number(req.body.openingAmount || 0) } })); }));
router.post('/cash/close', cashierRoles, asyncHandler(async (req, res) => { const session = await prisma.cashSession.findFirst({ where: { restaurantId: req.user.restaurantId, status: 'OPEN' } }); if (!session) throw new HttpError(404, 'Caixa aberto não encontrado'); res.json(await prisma.cashSession.update({ where: { id: session.id }, data: { status: 'CLOSED', closingAmount: Number(req.body.closingAmount), closedById: req.user.id, closedAt: new Date() } })); }));
router.post('/payments', cashierRoles, asyncHandler(async (req, res) => { const session = await prisma.cashSession.findFirst({ where: { restaurantId: req.user.restaurantId, status: 'OPEN' } }); if (!session) throw new HttpError(409, 'Abra o caixa antes de registrar movimentações'); const payment = await prisma.payment.create({ data: { restaurantId: req.user.restaurantId, userId: req.user.id, cashSessionId: session.id, tabId: req.body.tabId || null, type: req.body.type, method: req.body.method, amount: Number(req.body.amount), description: req.body.description } }); res.status(201).json(payment); }));

export default router;

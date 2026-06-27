import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError } from '../lib/http.js';
import { auth, permit } from '../middleware/auth.js';
import { emitFiscalDocument, fiscalReadiness, queueFiscalDocument } from '../lib/fiscal.js';

const router = Router();

const fiscalSchema = z.object({
  enabled: z.boolean().default(false),
  autoIssueCupom: z.boolean().default(true),
  environment: z.enum(['HOMOLOGATION', 'PRODUCTION']).default('HOMOLOGATION'),
  provider: z.string().trim().max(60).default('manual'),
  providerEndpoint: z.string().trim().optional().nullable(),
  providerToken: z.string().trim().optional().nullable(),
  certificateName: z.string().trim().optional().nullable(),
  certificateExpiresAt: z.coerce.date().optional().nullable(),
  cnpj: z.string().trim().optional().nullable(),
  legalName: z.string().trim().optional().nullable(),
  tradeName: z.string().trim().optional().nullable(),
  stateRegistration: z.string().trim().optional().nullable(),
  municipalRegistration: z.string().trim().optional().nullable(),
  taxRegime: z.string().trim().optional().nullable(),
  cep: z.string().trim().optional().nullable(),
  street: z.string().trim().optional().nullable(),
  number: z.string().trim().optional().nullable(),
  neighborhood: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  state: z.string().trim().max(2).optional().nullable(),
  nfceSeries: z.coerce.number().int().positive().default(1),
  nfceNextNumber: z.coerce.number().int().positive().default(1),
  nfeSeries: z.coerce.number().int().positive().default(1),
  nfeNextNumber: z.coerce.number().int().positive().default(1),
  pixKey: z.string().trim().optional().nullable(),
  pixMerchantName: z.string().trim().optional().nullable(),
  pixMerchantCity: z.string().trim().optional().nullable()
});

const ifoodSchema = z.object({
  enabled: z.boolean().default(false),
  storeId: z.string().trim().optional().nullable(),
  merchantId: z.string().trim().optional().nullable(),
  accessToken: z.string().trim().optional().nullable(),
  refreshToken: z.string().trim().optional().nullable(),
  webhookSecret: z.string().trim().optional().nullable()
});

const courierSchema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().trim().min(6),
  vehicle: z.string().trim().optional().nullable(),
  plate: z.string().trim().optional().nullable(),
  active: z.boolean().default(true)
});

const deliverySchema = z.object({
  orderId: z.string().optional().nullable(),
  courierId: z.string().optional().nullable(),
  externalId: z.string().optional().nullable(),
  customerName: z.string().trim().min(2),
  customerPhone: z.string().trim().optional().nullable(),
  address: z.string().trim().min(4),
  neighborhood: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  state: z.string().trim().max(2).optional().nullable(),
  amount: z.coerce.number().min(0).default(0),
  deliveryFee: z.coerce.number().min(0).default(0),
  notes: z.string().trim().optional().nullable()
});

router.post('/ifood/webhook', asyncHandler(async (req, res) => {
  const body = z.object({
    merchantId: z.string().optional(),
    storeId: z.string().optional(),
    orderId: z.string().optional(),
    id: z.string().optional(),
    customer: z.object({ name: z.string().optional(), phone: z.string().optional() }).optional(),
    deliveryAddress: z.object({ formattedAddress: z.string().optional(), neighborhood: z.string().optional(), city: z.string().optional(), state: z.string().optional() }).optional(),
    total: z.object({ orderAmount: z.coerce.number().optional(), deliveryFee: z.coerce.number().optional() }).optional()
  }).passthrough().parse(req.body);
  const integration = await prisma.integrationSetting.findFirst({
    where: {
      provider: 'IFOOD',
      enabled: true,
      OR: [{ merchantId: body.merchantId || undefined }, { storeId: body.storeId || undefined }]
    }
  });
  if (!integration) throw new HttpError(404, 'Loja iFood nao configurada');
  if (integration.webhookSecret && req.headers['x-orbe-webhook-secret'] !== integration.webhookSecret && req.headers['x-ifood-secret'] !== integration.webhookSecret) throw new HttpError(401, 'Webhook iFood nao autorizado');
  const externalId = body.orderId || body.id;
  if (!externalId) throw new HttpError(400, 'Pedido iFood sem identificador');
  const delivery = await prisma.deliveryOrder.upsert({
    where: { restaurantId_externalProvider_externalId: { restaurantId: integration.restaurantId, externalProvider: 'IFOOD', externalId } },
    create: {
      restaurantId: integration.restaurantId,
      externalProvider: 'IFOOD',
      externalId,
      customerName: body.customer?.name || 'Cliente iFood',
      customerPhone: body.customer?.phone || null,
      address: body.deliveryAddress?.formattedAddress || 'Endereco informado pelo iFood',
      neighborhood: body.deliveryAddress?.neighborhood || null,
      city: body.deliveryAddress?.city || null,
      state: body.deliveryAddress?.state || null,
      amount: body.total?.orderAmount || 0,
      deliveryFee: body.total?.deliveryFee || 0,
      notes: 'Pedido recebido via webhook iFood'
    },
    update: {
      customerName: body.customer?.name || undefined,
      customerPhone: body.customer?.phone || undefined,
      address: body.deliveryAddress?.formattedAddress || undefined,
      amount: body.total?.orderAmount ?? undefined,
      deliveryFee: body.total?.deliveryFee ?? undefined
    }
  });
  res.status(202).json({ received: true, deliveryId: delivery.id });
}));

router.use(auth);

function hideSecret(value) {
  return value ? `${value.slice(0, 4)}...${value.slice(-4)}` : '';
}

function publicIntegration(integration) {
  if (!integration) return null;
  return {
    ...integration,
    accessToken: hideSecret(integration.accessToken),
    refreshToken: hideSecret(integration.refreshToken),
    webhookSecret: hideSecret(integration.webhookSecret),
    hasAccessToken: !!integration.accessToken,
    hasRefreshToken: !!integration.refreshToken,
    hasWebhookSecret: !!integration.webhookSecret
  };
}

router.get('/', permit('settings.view', 'finance.view'), asyncHandler(async (req, res) => {
  const [fiscalSettings, ifood, couriers, deliveries, fiscalDocuments] = await Promise.all([
    prisma.fiscalSettings.findUnique({ where: { restaurantId: req.user.restaurantId } }),
    prisma.integrationSetting.findUnique({ where: { restaurantId_provider: { restaurantId: req.user.restaurantId, provider: 'IFOOD' } } }),
    prisma.courier.findMany({ where: { restaurantId: req.user.restaurantId }, orderBy: [{ active: 'desc' }, { name: 'asc' }] }),
    prisma.deliveryOrder.findMany({ where: { restaurantId: req.user.restaurantId }, include: { courier: true, order: true }, orderBy: { createdAt: 'desc' }, take: 80 }),
    prisma.fiscalDocument.findMany({
      where: { restaurantId: req.user.restaurantId },
      include: {
        payment: true,
        tab: {
          include: {
            table: true,
            customer: true,
            orders: {
              where: { status: { not: 'CANCELLED' } },
              include: { items: { include: { product: { select: { id: true, name: true } } } } }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 80
    })
  ]);
  res.json({ fiscalSettings, fiscalReadiness: fiscalReadiness(fiscalSettings), ifood: publicIntegration(ifood), couriers, deliveries, fiscalDocuments });
}));

router.put('/fiscal-settings', permit('settings.edit'), asyncHandler(async (req, res) => {
  const body = fiscalSchema.parse(req.body);
  const current = await prisma.fiscalSettings.findUnique({ where: { restaurantId: req.user.restaurantId } });
  const providerToken = body.providerToken || current?.providerToken || null;
  const settings = await prisma.fiscalSettings.upsert({
    where: { restaurantId: req.user.restaurantId },
    create: { ...body, providerToken, restaurantId: req.user.restaurantId },
    update: { ...body, providerToken }
  });
  res.json({ settings, readiness: fiscalReadiness(settings) });
}));

router.put('/ifood', permit('settings.edit'), asyncHandler(async (req, res) => {
  const body = ifoodSchema.parse(req.body);
  const current = await prisma.integrationSetting.findUnique({ where: { restaurantId_provider: { restaurantId: req.user.restaurantId, provider: 'IFOOD' } } });
  const hasMinimum = !!(body.enabled && body.storeId && body.merchantId && (body.accessToken || current?.accessToken));
  const integration = await prisma.integrationSetting.upsert({
    where: { restaurantId_provider: { restaurantId: req.user.restaurantId, provider: 'IFOOD' } },
    create: {
      restaurantId: req.user.restaurantId,
      provider: 'IFOOD',
      enabled: body.enabled,
      status: body.enabled ? (hasMinimum ? 'CONFIGURED' : 'ERROR') : 'DISABLED',
      storeId: body.storeId,
      merchantId: body.merchantId,
      accessToken: body.accessToken || null,
      refreshToken: body.refreshToken || null,
      webhookSecret: body.webhookSecret || null,
      lastError: body.enabled && !hasMinimum ? 'Informe loja, merchant e token oficial do iFood.' : null
    },
    update: {
      enabled: body.enabled,
      status: body.enabled ? (hasMinimum ? 'CONFIGURED' : 'ERROR') : 'DISABLED',
      storeId: body.storeId,
      merchantId: body.merchantId,
      accessToken: body.accessToken || current?.accessToken || null,
      refreshToken: body.refreshToken || current?.refreshToken || null,
      webhookSecret: body.webhookSecret || current?.webhookSecret || null,
      lastError: body.enabled && !hasMinimum ? 'Informe loja, merchant e token oficial do iFood.' : null
    }
  });
  res.json(publicIntegration(integration));
}));

router.post('/ifood/test', permit('settings.edit'), asyncHandler(async (req, res) => {
  const integration = await prisma.integrationSetting.findUnique({ where: { restaurantId_provider: { restaurantId: req.user.restaurantId, provider: 'IFOOD' } } });
  if (!integration?.enabled) throw new HttpError(409, 'Ative a integracao iFood antes do teste.');
  if (!integration.storeId || !integration.merchantId || !integration.accessToken) throw new HttpError(409, 'Credenciais oficiais do iFood incompletas.');
  const updated = await prisma.integrationSetting.update({
    where: { id: integration.id },
    data: { status: 'CONNECTED', lastSyncAt: new Date(), lastError: null }
  });
  res.json(publicIntegration(updated));
}));

router.post('/couriers', permit('settings.edit'), asyncHandler(async (req, res) => {
  const body = courierSchema.parse(req.body);
  res.status(201).json(await prisma.courier.create({ data: { ...body, restaurantId: req.user.restaurantId } }));
}));

router.patch('/couriers/:id', permit('settings.edit'), asyncHandler(async (req, res) => {
  const current = await prisma.courier.findFirst({ where: { id: req.params.id, restaurantId: req.user.restaurantId } });
  if (!current) throw new HttpError(404, 'Entregador nao encontrado');
  const body = courierSchema.partial().parse(req.body);
  res.json(await prisma.courier.update({ where: { id: current.id }, data: body }));
}));

router.post('/deliveries', permit('orders.edit', 'settings.edit'), asyncHandler(async (req, res) => {
  const body = deliverySchema.parse(req.body);
  if (body.courierId) {
    const courier = await prisma.courier.findFirst({ where: { id: body.courierId, restaurantId: req.user.restaurantId, active: true } });
    if (!courier) throw new HttpError(404, 'Entregador ativo nao encontrado');
  }
  const delivery = await prisma.deliveryOrder.create({
    data: {
      ...body,
      restaurantId: req.user.restaurantId,
      externalProvider: body.externalId ? 'IFOOD' : null,
      status: body.courierId ? 'ASSIGNED' : 'WAITING',
      assignedAt: body.courierId ? new Date() : null
    },
    include: { courier: true, order: true }
  });
  res.status(201).json(delivery);
}));

router.patch('/deliveries/:id/status', permit('orders.edit', 'settings.edit'), asyncHandler(async (req, res) => {
  const body = z.object({ status: z.enum(['WAITING', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED']), courierId: z.string().optional().nullable() }).parse(req.body);
  const current = await prisma.deliveryOrder.findFirst({ where: { id: req.params.id, restaurantId: req.user.restaurantId } });
  if (!current) throw new HttpError(404, 'Entrega nao encontrada');
  const dates = body.status === 'ASSIGNED' ? { assignedAt: new Date() } : body.status === 'PICKED_UP' ? { pickedUpAt: new Date() } : body.status === 'DELIVERED' ? { deliveredAt: new Date() } : body.status === 'CANCELLED' ? { cancelledAt: new Date() } : {};
  res.json(await prisma.deliveryOrder.update({ where: { id: current.id }, data: { status: body.status, courierId: body.courierId ?? current.courierId, ...dates }, include: { courier: true, order: true } }));
}));

router.post('/fiscal-documents/:id/issue', permit('finance.edit', 'settings.edit'), asyncHandler(async (req, res) => {
  const document = await prisma.fiscalDocument.findFirst({ where: { id: req.params.id, restaurantId: req.user.restaurantId } });
  if (!document) throw new HttpError(404, 'Documento fiscal nao encontrado');
  const settings = await prisma.fiscalSettings.findUnique({ where: { restaurantId: req.user.restaurantId } });
  await prisma.$transaction(tx => queueFiscalDocument(tx, document, settings));
  res.json(await emitFiscalDocument(prisma, document.id));
}));

export default router;

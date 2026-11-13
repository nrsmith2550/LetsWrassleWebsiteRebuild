import { Router } from 'express';
import { config, gatewaysEnabled } from '../config';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
import { asyncHandler, HttpError, serializeOrder, serializeProduct } from '../utils';

const router = Router();

router.get('/config', (_req, res) => {
  const enabled = (['STRIPE', 'SQUARE'] as const).filter((g) => gatewaysEnabled[g]);
  const primary = enabled.includes(config.store.primaryGateway) ? config.store.primaryGateway : enabled[0] || null;
  res.json({
    gateways: enabled,
    primaryGateway: primary,
    stripePublishableKey: gatewaysEnabled.STRIPE ? config.stripe.publishableKey : null,
    square: gatewaysEnabled.SQUARE
      ? {
          applicationId: config.square.applicationId,
          locationId: config.square.locationId,
          environment: config.square.environment,
        }
      : null,
    store: {
      shippingFlatCents: config.store.shippingFlatCents,
      freeShippingOverCents: config.store.freeShippingOverCents,
      taxRate: config.store.taxRate,
    },
  });
});

router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
    res.json({ categories });
  }),
);

router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const { category, sort, featured } = req.query as Record<string, string | undefined>;
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        category: { isActive: true, ...(category ? { slug: category } : {}) },
        ...(featured === 'true' ? { isFeatured: true } : {}),
      },
      include: { category: true, variants: true },
      orderBy: { createdAt: 'desc' },
    });
    let list = products.map(serializeProduct);
    if (sort === 'price-asc') list.sort((a, b) => a.minPriceCents - b.minPriceCents);
    else if (sort === 'price-desc') list.sort((a, b) => b.minPriceCents - a.minPriceCents);
    else if (sort === 'newest') list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    else list.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured)); // "featured" (stable)
    res.json({ products: list });
  }),
);

router.get(
  '/products/:slug',
  asyncHandler(async (req, res) => {
    const p = await prisma.product.findFirst({
      where: { slug: req.params.slug, isActive: true },
      include: { category: true, variants: { orderBy: { id: 'asc' } } },
    });
    if (!p) throw new HttpError(404, 'Product not found');
    res.json({ product: serializeProduct(p) });
  }),
);

router.get(
  '/videos',
  asyncHandler(async (_req, res) => {
    const videos = await prisma.videoPost.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ videos });
  }),
);

/** Customer account portal */
router.get(
  '/account/orders',
  requireAuth,
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: {
        paymentStatus: { in: ['PAID', 'REFUNDED'] },
        OR: [{ userId: req.user!.id }, { userId: null, customerEmail: req.user!.email }],
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ orders: orders.map(serializeOrder) });
  }),
);

export default router;

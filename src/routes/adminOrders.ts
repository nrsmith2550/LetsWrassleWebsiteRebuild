import { Router } from 'express';
import { z } from 'zod';
import { ORDER_STATUSES } from '../constants';
import { prisma } from '../db';
import { sendStatusUpdate } from '../services/email';
import { getRates, purchaseLabel } from '../services/shipping';
import { asyncHandler, HttpError, parseJson, serializeOrder } from '../utils';

const router = Router();

/** Default package = sum of item weights, largest L/W, stacked heights. */
async function packageDefaults(order: any) {
  const ids = order.items.map((i: any) => i.productId).filter(Boolean);
  const products = await prisma.product.findMany({ where: { id: { in: ids } } });
  let weightOz = 0,
    length = 0,
    width = 0,
    height = 0;
  for (const item of order.items) {
    const p = products.find((x) => x.id === item.productId);
    if (!p) continue;
    weightOz += p.defaultWeightOz * item.quantity;
    length = Math.max(length, p.defaultLengthIn);
    width = Math.max(width, p.defaultWidthIn);
    height += p.defaultHeightIn * item.quantity;
  }
  return {
    weightOz: Math.round(weightOz * 10) / 10 || 8,
    lengthIn: length || 10,
    widthIn: width || 8,
    heightIn: Math.round(height * 10) / 10 || 1,
  };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, q, payment, includeUnpaid } = req.query as Record<string, string | undefined>;
    const where: any = {};
    if (status && (ORDER_STATUSES as readonly string[]).includes(status)) where.orderStatus = status;
    if (payment === 'STRIPE' || payment === 'SQUARE') where.paymentProvider = payment;
    if (includeUnpaid !== 'true') where.paymentStatus = { in: ['PAID', 'REFUNDED'] };
    if (q) {
      where.OR = [
        { orderNumber: { contains: q } },
        { customerName: { contains: q } },
        { customerEmail: { contains: q } },
        { customerPhone: { contains: q } },
      ];
    }
    const orders = await prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    res.json({ orders: orders.map(serializeOrder) });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: Number(req.params.id) }, include: { items: true } });
    if (!order) throw new HttpError(404, 'Order not found');
    res.json({ order: serializeOrder(order), packageDefaults: await packageDefaults(order) });
  }),
);

router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const body = z
      .object({ status: z.enum(ORDER_STATUSES), note: z.string().trim().max(1000).optional(), notify: z.boolean().default(true) })
      .parse(req.body);
    const existing = await prisma.order.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) throw new HttpError(404, 'Order not found');
    const order = await prisma.order.update({
      where: { id: existing.id },
      data: { orderStatus: body.status },
      include: { items: true },
    });
    // Every status change automatically notifies the customer.
    if (body.notify) await sendStatusUpdate(order, body.note);
    res.json({ order: serializeOrder(order), notified: body.notify });
  }),
);

const parcelSchema = z.object({
  weightLbs: z.coerce.number().min(0).default(0),
  weightOz: z.coerce.number().min(0).default(0),
  lengthIn: z.coerce.number().positive('Length required'),
  widthIn: z.coerce.number().positive('Width required'),
  heightIn: z.coerce.number().positive('Height required'),
});

function toParcel(p: z.infer<typeof parcelSchema>) {
  const totalOz = p.weightLbs * 16 + p.weightOz;
  if (totalOz <= 0) throw new HttpError(400, 'Weight must be greater than zero.');
  return { weightOz: totalOz, lengthIn: p.lengthIn, widthIn: p.widthIn, heightIn: p.heightIn };
}

function destination(order: any) {
  const a = parseJson<any>(order.shippingAddressJson, null);
  if (order.fulfillmentMethod !== 'SHIPPING' || !a) throw new HttpError(400, 'This order is Local Pickup — no label needed.');
  return {
    name: order.customerName,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    state: a.state,
    postalCode: a.postalCode,
    country: a.country || 'US',
    phone: order.customerPhone,
    email: order.customerEmail,
  };
}

router.post(
  '/:id/shipping-rates',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: Number(req.params.id) } });
    if (!order) throw new HttpError(404, 'Order not found');
    const parcel = toParcel(parcelSchema.parse(req.body));
    const rates = await getRates(destination(order), parcel);
    res.json({ rates });
  }),
);

router.post(
  '/:id/purchase-label',
  asyncHandler(async (req, res) => {
    const body = parcelSchema.extend({ rateId: z.string().min(3) }).parse(req.body);
    const order = await prisma.order.findUnique({ where: { id: Number(req.params.id) } });
    if (!order) throw new HttpError(404, 'Order not found');
    destination(order); // validates shipping order
    const parcel = toParcel(body);
    const label = await purchaseLabel(body.rateId);
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        packageWeightOz: parcel.weightOz,
        packageLengthIn: parcel.lengthIn,
        packageWidthIn: parcel.widthIn,
        packageHeightIn: parcel.heightIn,
        shippingCarrier: label.carrier,
        shippingService: label.service,
        trackingNumber: label.trackingNumber,
        trackingUrl: label.trackingUrl,
        shippingLabelPdfUrl: label.labelUrl,
        orderStatus: 'SHIPPED',
      },
      include: { items: true },
    });
    await sendStatusUpdate(updated, 'Your tracking number is below.');
    res.json({ order: serializeOrder(updated), label });
  }),
);

export default router;

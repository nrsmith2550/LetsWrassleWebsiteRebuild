import { z } from 'zod';
import { config } from '../config';
import { prisma } from '../db';
import { HttpError } from '../utils';
import { sendOrderConfirmation, sendOwnerNewOrder } from './email';

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+()\-.\s\d]{7,25}$/, 'Enter a valid phone number')
  .refine((v) => v.replace(/\D/g, '').length >= 10, 'Enter a valid phone number');

export const addressSchema = z.object({
  line1: z.string().trim().min(3, 'Street address required'),
  line2: z.string().trim().optional().default(''),
  city: z.string().trim().min(2, 'City required'),
  state: z.string().trim().min(2, 'State required').max(30),
  postalCode: z.string().trim().min(3, 'ZIP / postal code required').max(12),
  country: z.string().trim().min(2).default('US'),
});

export const cartItemsSchema = z
  .array(z.object({ variantId: z.number().int(), quantity: z.number().int().min(1).max(20) }))
  .min(1, 'Your cart is empty');

export const checkoutSchema = z
  .object({
    items: cartItemsSchema,
    customer: z.object({
      name: z.string().trim().min(2, 'Full name is required'),
      email: z.string().trim().toLowerCase().email('Enter a valid email'),
      phone: phoneSchema,
    }),
    fulfillmentMethod: z.enum(['SHIPPING', 'LOCAL_PICKUP']),
    shippingAddress: addressSchema.optional(),
  })
  .refine((d) => d.fulfillmentMethod === 'LOCAL_PICKUP' || !!d.shippingAddress, {
    message: 'Shipping address is required',
    path: ['shippingAddress'],
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Prices everything from the database — never trusts client-side totals. */
export async function buildQuote(items: CheckoutInput['items'], fulfillment: string) {
  const merged = new Map<number, number>();
  for (const i of items) merged.set(i.variantId, (merged.get(i.variantId) || 0) + i.quantity);

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: [...merged.keys()] } },
    include: { product: true },
  });

  const lines = [...merged.entries()].map(([variantId, quantity]) => {
    const v = variants.find((x) => x.id === variantId);
    if (!v || !v.product.isActive) throw new HttpError(400, 'An item in your cart is no longer available.');
    if (v.stockQuantity < quantity) {
      throw new HttpError(
        409,
        v.stockQuantity <= 0
          ? `${v.product.name} (${[v.size, v.color].filter(Boolean).join(' / ')}) is out of stock.`
          : `Only ${v.stockQuantity} left of ${v.product.name} (${[v.size, v.color].filter(Boolean).join(' / ')}).`,
      );
    }
    return {
      variant: v,
      product: v.product,
      quantity,
      unitPriceCents: v.priceOverrideCents ?? v.product.basePriceCents,
    };
  });

  const subtotalCents = lines.reduce((n, l) => n + l.unitPriceCents * l.quantity, 0);
  const { shippingFlatCents, freeShippingOverCents, taxRate } = config.store;
  const shippingCents =
    fulfillment === 'LOCAL_PICKUP' || (freeShippingOverCents > 0 && subtotalCents >= freeShippingOverCents)
      ? 0
      : shippingFlatCents;
  const taxCents = Math.round(subtotalCents * taxRate);
  return { lines, subtotalCents, shippingCents, taxCents, totalCents: subtotalCents + shippingCents + taxCents };
}

/** Creates an unpaid order (stock is only deducted once payment succeeds). */
export async function createPendingOrder(
  input: CheckoutInput,
  provider: 'STRIPE' | 'SQUARE',
  sessionUserId?: number,
) {
  const quote = await buildQuote(input.items, input.fulfillmentMethod);

  // Auto-link guest checkouts to an existing account with the same email.
  let userId = sessionUserId ?? null;
  if (!userId) {
    const existing = await prisma.user.findUnique({ where: { email: input.customer.email } });
    userId = existing?.id ?? null;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const last = await prisma.order.findFirst({ orderBy: { id: 'desc' }, select: { orderNumber: true } });
      const next = last ? parseInt(last.orderNumber.split('-')[1], 10) + 1 : 1001;
      const order = await prisma.order.create({
        data: {
          orderNumber: `LW-${next}`,
          userId,
          customerName: input.customer.name,
          customerEmail: input.customer.email,
          customerPhone: input.customer.phone,
          fulfillmentMethod: input.fulfillmentMethod,
          shippingAddressJson:
            input.fulfillmentMethod === 'SHIPPING' ? JSON.stringify(input.shippingAddress) : null,
          subtotalCents: quote.subtotalCents,
          shippingCents: quote.shippingCents,
          taxCents: quote.taxCents,
          totalCents: quote.totalCents,
          paymentProvider: provider,
          paymentStatus: 'PENDING',
          orderStatus: 'PENDING',
          items: {
            create: quote.lines.map((l) => ({
              productId: l.product.id,
              variantId: l.variant.id,
              productName: l.product.name,
              variantSummary: [l.variant.size && `Size: ${l.variant.size}`, l.variant.color && `Color: ${l.variant.color}`]
                .filter(Boolean)
                .join(' / '),
              quantity: l.quantity,
              unitPriceCents: l.unitPriceCents,
            })),
          },
        },
        include: { items: true },
      });
      return order;
    } catch (err: any) {
      if (err?.code === 'P2002' && attempt < 2) continue; // order-number race
      throw err;
    }
  }
  throw new HttpError(500, 'Could not create order.');
}

/**
 * Idempotent: marks the order PAID, deducts stock and sends the owner + customer
 * emails exactly once, no matter how many times it is called (finalize endpoint,
 * webhook, retries).
 */
export async function markOrderPaid(orderId: number, transactionId?: string) {
  const won = await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: { not: 'PAID' } },
    data: {
      paymentStatus: 'PAID',
      orderStatus: 'PROCESSING',
      ...(transactionId ? { paymentTransactionId: transactionId } : {}),
    },
  });

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new HttpError(404, 'Order not found');
  if (won.count === 0) return order; // already processed

  for (const item of order.items) {
    if (!item.variantId) continue;
    const v = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
    if (v) {
      await prisma.productVariant.update({
        where: { id: v.id },
        data: { stockQuantity: Math.max(0, v.stockQuantity - item.quantity) },
      });
    }
  }

  // fire-and-forget; failures are logged inside sendEmail
  void sendOwnerNewOrder(order);
  void sendOrderConfirmation(order);
  return order;
}

export async function markOrderFailed(orderId: number) {
  await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: 'PENDING' },
    data: { paymentStatus: 'FAILED' },
  });
}

/** Safe summary for the confirmation page. */
export function publicOrderSummary(o: any) {
  return {
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    fulfillmentMethod: o.fulfillmentMethod,
    subtotalCents: o.subtotalCents,
    shippingCents: o.shippingCents,
    taxCents: o.taxCents,
    totalCents: o.totalCents,
    items: (o.items || []).map((i: any) => ({
      productName: i.productName,
      variantSummary: i.variantSummary,
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
    })),
  };
}

/** Links any guest orders with this email to the user account. */
export async function linkGuestOrders(userId: number, email: string) {
  await prisma.order.updateMany({ where: { userId: null, customerEmail: email }, data: { userId } });
}

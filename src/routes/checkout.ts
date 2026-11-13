import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { config } from '../config';
import { prisma } from '../db';
import { chargeSquare, createStripeIntent, stripe } from '../services/payments';
import {
  buildQuote,
  cartItemsSchema,
  checkoutSchema,
  createPendingOrder,
  markOrderFailed,
  markOrderPaid,
  publicOrderSummary,
} from '../services/orders';
import { asyncHandler, HttpError } from '../utils';

const router = Router();

/** Live totals for the checkout page. */
router.post(
  '/quote',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        items: cartItemsSchema,
        fulfillmentMethod: z.enum(['SHIPPING', 'LOCAL_PICKUP']),
      })
      .parse(req.body);
    const q = await buildQuote(body.items, body.fulfillmentMethod);
    res.json({
      subtotalCents: q.subtotalCents,
      shippingCents: q.shippingCents,
      taxCents: q.taxCents,
      totalCents: q.totalCents,
    });
  }),
);

/** ───────── Stripe ───────── */
router.post(
  '/stripe/create-intent',
  asyncHandler(async (req, res) => {
    const input = checkoutSchema.parse(req.body);
    const order = await createPendingOrder(input, 'STRIPE', req.user?.id);
    const intent = await createStripeIntent(order.totalCents, order.orderNumber, order.customerEmail);
    await prisma.order.update({ where: { id: order.id }, data: { paymentTransactionId: intent.id } });
    res.json({ clientSecret: intent.client_secret, paymentIntentId: intent.id, orderNumber: order.orderNumber });
  }),
);

/** Called by the browser after stripe.confirmPayment() succeeds in-page. */
router.post(
  '/stripe/finalize',
  asyncHandler(async (req, res) => {
    const { paymentIntentId } = z.object({ paymentIntentId: z.string().min(5) }).parse(req.body);
    const order = await prisma.order.findFirst({
      where: { paymentTransactionId: paymentIntentId, paymentProvider: 'STRIPE' },
    });
    if (!order) throw new HttpError(404, 'Order not found');
    const intent = await stripe().paymentIntents.retrieve(paymentIntentId);
    // Verify with Stripe directly — never trust the browser.
    if (intent.status !== 'succeeded' || intent.amount !== order.totalCents) {
      throw new HttpError(402, 'Payment has not been completed.');
    }
    const paid = await markOrderPaid(order.id, intent.id);
    res.json({ order: publicOrderSummary(paid) });
  }),
);

/** Optional safety net: POST /api/checkout/stripe/webhook (raw body; see index.ts). */
export async function stripeWebhook(req: Request, res: Response) {
  try {
    if (!config.stripe.webhookSecret) return res.status(200).json({ ignored: true });
    const sig = req.headers['stripe-signature'] as string;
    const event = stripe().webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret);
    if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
      const pi: any = event.data.object;
      const order = await prisma.order.findFirst({ where: { paymentTransactionId: pi.id, paymentProvider: 'STRIPE' } });
      if (order) {
        if (event.type === 'payment_intent.succeeded') await markOrderPaid(order.id, pi.id);
        else await markOrderFailed(order.id);
      }
    }
    res.json({ received: true });
  } catch (err: any) {
    console.error('[stripe webhook]', err?.message);
    res.status(400).send('Webhook error');
  }
}

/** ───────── Square ───────── */
router.post(
  '/square/pay',
  asyncHandler(async (req, res) => {
    const { sourceId, ...rest } = z.object({ sourceId: z.string().min(5) }).passthrough().parse(req.body);
    const input = checkoutSchema.parse(rest);
    const order = await createPendingOrder(input, 'SQUARE', req.user?.id);
    try {
      const { transactionId } = await chargeSquare({
        sourceId,
        amountCents: order.totalCents,
        orderNumber: order.orderNumber,
        email: order.customerEmail,
      });
      const paid = await markOrderPaid(order.id, transactionId);
      res.json({ order: publicOrderSummary(paid) });
    } catch (err) {
      await markOrderFailed(order.id);
      throw err;
    }
  }),
);

export default router;

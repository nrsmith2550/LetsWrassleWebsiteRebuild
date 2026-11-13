import crypto from 'crypto';
import Stripe from 'stripe';
import { ApiError, Client, Environment } from 'square';
import { config, gatewaysEnabled } from '../config';
import { HttpError } from '../utils';

/** ───────── Stripe (PaymentIntents + embedded <PaymentElement/>) ───────── */
let stripeClient: Stripe | null = null;
export function stripe() {
  if (!gatewaysEnabled.STRIPE) throw new HttpError(503, 'Stripe is not configured.');
  if (!stripeClient) stripeClient = new Stripe(config.stripe.secretKey);
  return stripeClient;
}

export async function createStripeIntent(amountCents: number, orderNumber: string, email: string) {
  // allow_redirects:'never' guarantees customers are never sent off-site.
  return stripe().paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    receipt_email: email,
    description: `Let's Wrassle order ${orderNumber}`,
    metadata: { orderNumber },
  });
}

/** ───────── Square (Web Payments SDK token → Payments API) ───────── */
let squareClient: Client | null = null;
function square() {
  if (!gatewaysEnabled.SQUARE) throw new HttpError(503, 'Square is not configured.');
  if (!squareClient) {
    squareClient = new Client({
      accessToken: config.square.accessToken,
      environment: config.square.environment === 'production' ? Environment.Production : Environment.Sandbox,
    });
  }
  return squareClient;
}

export async function chargeSquare(opts: { sourceId: string; amountCents: number; orderNumber: string; email: string }) {
  try {
    const { result } = await square().paymentsApi.createPayment({
      sourceId: opts.sourceId,
      idempotencyKey: crypto.randomUUID(),
      amountMoney: { amount: BigInt(opts.amountCents), currency: 'USD' },
      locationId: config.square.locationId,
      referenceId: opts.orderNumber,
      buyerEmailAddress: opts.email,
      note: `Let's Wrassle order ${opts.orderNumber}`,
    });
    const p = result.payment;
    if (!p || (p.status !== 'COMPLETED' && p.status !== 'APPROVED')) {
      throw new HttpError(402, 'Payment was not completed.');
    }
    return { transactionId: p.id as string };
  } catch (err: any) {
    if (err instanceof HttpError) throw err;
    if (err instanceof ApiError) {
      const detail = err.result?.errors?.[0]?.detail || 'Your card was declined.';
      throw new HttpError(402, detail);
    }
    throw err;
  }
}

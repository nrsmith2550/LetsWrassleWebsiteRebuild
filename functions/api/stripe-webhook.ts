import { saveOrder } from '../../shared/db';
import { sendOrderEmails } from '../../shared/email';
import { json, type Ctx } from '../../shared/server';
import type { OrderSummary } from '../../shared/types';

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Verifies Stripe's signature header (HMAC-SHA256 over "timestamp.payload"). */
async function verify(payload: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const t = parts['t'];
  if (!t || !parts['v1']) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false; // replay protection
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`)));
  // header may carry several v1 signatures during secret rotation
  return header.split(',').some((p) => p.startsWith('v1=') && p.slice(3) === sig);
}

/** Add this URL as a webhook endpoint in Stripe for the event payment_intent.succeeded. */
export const onRequestPost = async (ctx: Ctx) => {
  const { env, request } = ctx;
  if (!env.STRIPE_WEBHOOK_SECRET) return json({ error: 'Webhook not configured.' }, 503);

  const payload = await request.text();
  const ok = await verify(payload, request.headers.get('stripe-signature') || '', env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return json({ error: 'Bad signature' }, 400);

  const event = JSON.parse(payload);
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const m = pi.metadata || {};
    if (m.order_number) {
      let raw = '';
      for (let n = 1; m[`lines_${n}`]; n++) raw += m[`lines_${n}`];
      const lines = (JSON.parse(raw || '[]') as [string, string, number, number][]).map(([productName, variantSummary, quantity, unitPriceCents]) => ({
        variantId: '',
        productName,
        variantSummary,
        quantity,
        unitPriceCents,
      }));
      const subtotalCents = lines.reduce((n, l) => n + l.unitPriceCents * l.quantity, 0);
      const order: OrderSummary = {
        lines,
        subtotalCents,
        shippingCents: Number(m.shipping_cents || 0),
        taxCents: Number(m.tax_cents || 0),
        totalCents: pi.amount,
        orderNumber: m.order_number,
        provider: 'STRIPE',
        customer: { name: m.name, email: m.email, phone: m.phone },
        fulfillment: m.fulfillment === 'LOCAL_PICKUP' ? 'LOCAL_PICKUP' : 'SHIPPING',
        address: m.address ? JSON.parse(m.address) : undefined,
      };
      // Stripe retries webhooks; only the first delivery saves the order and sends emails.
      if (await saveOrder(env, order, pi.id)) ctx.waitUntil(sendOrderEmails(env, order));
    }
  }
  return json({ received: true });
};

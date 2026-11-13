import { priceCart } from '../../shared/pricing';
import { json, loadCatalog, newOrderNumber, type Ctx } from '../../shared/server';
import type { OrderSummary } from '../../shared/types';
import { validateCheckout } from '../../shared/validate';

/**
 * Creates a Stripe PaymentIntent for Apple Pay / Google Pay (Express Checkout Element).
 * Everything the webhook needs to email the order is stored in the intent's metadata,
 * so no database is required.
 */
export const onRequestPost = async (ctx: Ctx) => {
  const { env, request } = ctx;
  if (!env.STRIPE_SECRET_KEY) return json({ error: 'Wallet payments are not configured.' }, 503);

  let req, quote;
  try {
    req = validateCheckout(await request.json().catch(() => ({})));
    quote = priceCart(await loadCatalog(ctx), req.items, req.fulfillment);
  } catch (e: any) {
    return json({ error: e.message }, 400);
  }

  const orderNumber = newOrderNumber();
  const form = new URLSearchParams();
  form.set('amount', String(quote.totalCents));
  form.set('currency', 'usd');
  form.set('automatic_payment_methods[enabled]', 'true');
  form.set('automatic_payment_methods[allow_redirects]', 'never'); // never leave the site
  form.set('receipt_email', req.customer.email);
  form.set('description', `Let's Wrassle order ${orderNumber}`);
  form.set('metadata[order_number]', orderNumber);
  form.set('metadata[name]', req.customer.name);
  form.set('metadata[email]', req.customer.email);
  form.set('metadata[phone]', req.customer.phone);
  form.set('metadata[fulfillment]', req.fulfillment);
  form.set('metadata[shipping_cents]', String(quote.shippingCents));
  form.set('metadata[tax_cents]', String(quote.taxCents));
  if (req.address) form.set('metadata[address]', JSON.stringify(req.address));

  // Compact line items split across metadata keys (500 chars each).
  const lines = JSON.stringify(quote.lines.map((l) => [l.productName, l.variantSummary, l.quantity, l.unitPriceCents]));
  for (let i = 0, n = 1; i < lines.length; i += 480, n++) form.set(`metadata[lines_${n}]`, lines.slice(i, i + 480));

  if (req.address) {
    form.set('shipping[name]', req.customer.name);
    form.set('shipping[phone]', req.customer.phone);
    form.set('shipping[address][line1]', req.address.line1);
    if (req.address.line2) form.set('shipping[address][line2]', req.address.line2);
    form.set('shipping[address][city]', req.address.city);
    form.set('shipping[address][state]', req.address.state);
    form.set('shipping[address][postal_code]', req.address.postalCode);
    form.set('shipping[address][country]', req.address.country);
  }

  const res = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: form,
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) return json({ error: data?.error?.message || 'Could not start payment.' }, 502);

  const order: OrderSummary = { ...quote, orderNumber, provider: 'STRIPE', customer: req.customer, fulfillment: req.fulfillment, address: req.address };
  return json({ clientSecret: data.client_secret, order });
};

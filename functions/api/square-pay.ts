import { sendOrderEmails } from '../../shared/email';
import { priceCart } from '../../shared/pricing';
import { json, loadCatalog, newOrderNumber, type Ctx } from '../../shared/server';
import type { OrderSummary } from '../../shared/types';
import { validateCheckout } from '../../shared/validate';

/**
 * Square card payments. The browser tokenizes the card with Square's Web Payments
 * SDK (card data never reaches us) and posts the token here along with the cart.
 * We re-price the cart from catalog.json and charge that amount.
 */
export const onRequestPost = async (ctx: Ctx) => {
  const { env, request } = ctx;
  if (!env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID) return json({ error: 'Card payments are not configured.' }, 503);

  let req, quote;
  const body: any = await request.json().catch(() => ({}));
  try {
    req = validateCheckout(body);
    quote = priceCart(await loadCatalog(ctx), req.items, req.fulfillment);
  } catch (e: any) {
    return json({ error: e.message }, 400);
  }
  const sourceId = typeof body.sourceId === 'string' ? body.sourceId : '';
  if (!sourceId) return json({ error: 'Missing card token.' }, 400);

  const orderNumber = newOrderNumber();
  const itemsNote = quote.lines.map((l) => `${l.quantity}x ${l.productName} (${l.variantSummary})`).join('; ');
  const note = [orderNumber, req.customer.name, req.customer.phone, req.customer.email, req.fulfillment === 'LOCAL_PICKUP' ? 'LOCAL PICKUP' : 'SHIP', itemsNote]
    .join(' | ')
    .slice(0, 490);

  const host = env.SQUARE_ENVIRONMENT === 'production' ? 'connect.squareup.com' : 'connect.squareupsandbox.com';
  const payment: Record<string, unknown> = {
    source_id: sourceId,
    idempotency_key: crypto.randomUUID(),
    amount_money: { amount: quote.totalCents, currency: 'USD' },
    location_id: env.SQUARE_LOCATION_ID,
    reference_id: orderNumber,
    buyer_email_address: req.customer.email,
    note,
    autocomplete: true,
  };
  if (req.address) {
    const [first, ...rest] = req.customer.name.split(' ');
    payment.shipping_address = {
      first_name: first,
      last_name: rest.join(' '),
      address_line_1: req.address.line1,
      address_line_2: req.address.line2 || undefined,
      locality: req.address.city,
      administrative_district_level_1: req.address.state,
      postal_code: req.address.postalCode,
      country: req.address.country,
    };
  }

  const res = await fetch(`https://${host}/v2/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Square-Version': '2024-10-17',
    },
    body: JSON.stringify(payment),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data.payment || !['COMPLETED', 'APPROVED'].includes(data.payment.status)) {
    const detail = data?.errors?.[0]?.detail || 'Your card was declined. Please try another card.';
    return json({ error: detail }, 402);
  }

  const order: OrderSummary = { ...quote, orderNumber, provider: 'SQUARE', customer: req.customer, fulfillment: req.fulfillment, address: req.address };
  ctx.waitUntil(sendOrderEmails(env, order));
  return json({ order });
};

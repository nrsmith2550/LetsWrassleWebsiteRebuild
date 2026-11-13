import { guard } from '../../../../../shared/adminAuth';
import { rowToOrder } from '../../../../../shared/db';
import { sendStatusEmail } from '../../../../../shared/email';
import { parseParcel } from '../../../../../shared/package';
import { json, type Ctx } from '../../../../../shared/server';
import { getRates, purchaseLabel, ShippoError } from '../../../../../shared/shippo';

/**
 * POST /api/admin/orders/:id/label  { weightOz, lengthIn, widthIn, heightIn, rateId? }
 * One click: without a rateId it buys the cheapest USPS/UPS rate. Saves tracking + label URL,
 * marks the order SHIPPED and emails the customer their tracking number.
 */
export const onRequestPost = async (ctx: Ctx) => {
  const denied = await guard(ctx);
  if (denied) return denied;
  const { env } = ctx;
  if (!env.DB) return json({ error: 'Orders database is not connected.' }, 503);
  try {
    const row = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(Number(ctx.params.id)).first();
    if (!row) return json({ error: 'Order not found.' }, 404);
    const o = rowToOrder(row);
    if (o.fulfillment !== 'SHIPPING' || !o.address) return json({ error: 'This is a Local Pickup order, so no label is needed.' }, 400);

    const body: any = await ctx.request.json().catch(() => ({}));
    if (o.labelUrl && !body.force) return json({ error: 'A label was already bought for this order.' }, 409);

    let label;
    if (typeof body.rateId === 'string' && body.rateId) {
      label = await purchaseLabel(env, body.rateId);
    } else {
      // One click: try the cheapest rate; if that carrier/service refuses the purchase, try the next one.
      const parcel = parseParcel(body);
      const rates = await getRates(env, { ...o.address, name: o.customer.name, phone: o.customer.phone, email: o.customer.email }, parcel);
      let lastError: unknown = null;
      for (const rate of rates.slice(0, 4)) {
        try {
          label = await purchaseLabel(env, rate.id);
          break;
        } catch (e) {
          lastError = e;
        }
      }
      if (!label) throw lastError;
    }

    await env.DB.prepare(
      `UPDATE orders SET carrier=?, service=?, tracking_number=?, tracking_url=?, label_url=?, label_cost_cents=?,
         status='SHIPPED', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?`,
    )
      .bind(label.carrier, label.service, label.trackingNumber, label.trackingUrl, label.labelUrl, label.amountCents, o.id)
      .run();

    ctx.waitUntil(
      sendStatusEmail(env, {
        orderNumber: o.orderNumber,
        customerName: o.customer.name,
        customerEmail: o.customer.email,
        status: 'SHIPPED',
        carrier: label.carrier,
        service: label.service,
        trackingNumber: label.trackingNumber,
        trackingUrl: label.trackingUrl,
      }),
    );
    const updated = rowToOrder(await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(o.id).first());
    return json({ order: updated, label });
  } catch (e: any) {
    return json({ error: e.message }, e instanceof ShippoError ? e.status : 400);
  }
};

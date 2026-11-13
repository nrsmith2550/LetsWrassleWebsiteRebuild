import { guard } from '../../../../shared/adminAuth';
import { ORDER_STATUSES, rowToOrder } from '../../../../shared/db';
import { sendStatusEmail } from '../../../../shared/email';
import { defaultParcel } from '../../../../shared/package';
import { json, loadCatalog, type Ctx } from '../../../../shared/server';
import { shippoConfigured } from '../../../../shared/shippo';

async function load(ctx: Ctx) {
  const row = await ctx.env.DB!.prepare('SELECT * FROM orders WHERE id = ?').bind(Number(ctx.params.id)).first();
  return row ? rowToOrder(row) : null;
}

/** GET /api/admin/orders/:id */
export const onRequestGet = async (ctx: Ctx) => {
  const denied = await guard(ctx);
  if (denied) return denied;
  if (!ctx.env.DB) return json({ error: 'Orders database is not connected.' }, 503);
  const order = await load(ctx);
  if (!order) return json({ error: 'Order not found.' }, 404);
  let parcel: ReturnType<typeof defaultParcel> | null = null;
  try {
    parcel = defaultParcel(await loadCatalog(ctx), order.items);
  } catch {
    /* catalog unavailable: the form just starts empty */
  }
  return json({ order, parcel, labelsReady: shippoConfigured(ctx.env) });
};

/** PATCH /api/admin/orders/:id  { status?, notes?, notify? } */
export const onRequestPatch = async (ctx: Ctx) => {
  const denied = await guard(ctx);
  if (denied) return denied;
  if (!ctx.env.DB) return json({ error: 'Orders database is not connected.' }, 503);
  const body: any = await ctx.request.json().catch(() => ({}));
  const order = await load(ctx);
  if (!order) return json({ error: 'Order not found.' }, 404);

  const sets: string[] = [];
  const vals: unknown[] = [];
  if (body.status !== undefined) {
    if (!(ORDER_STATUSES as readonly string[]).includes(body.status)) return json({ error: 'Unknown status.' }, 400);
    sets.push('status = ?');
    vals.push(body.status);
  }
  if (body.notes !== undefined) {
    sets.push('notes = ?');
    vals.push(String(body.notes).slice(0, 4000));
  }
  if (!sets.length) return json({ error: 'Nothing to update.' }, 400);
  sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
  await ctx.env.DB.prepare(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`).bind(...vals, order.id).run();

  const updated = (await load(ctx))!;
  let emailed = false;
  if (body.status !== undefined && body.status !== order.status && body.notify !== false) {
    emailed = true;
    ctx.waitUntil(
      sendStatusEmail(ctx.env, {
        orderNumber: updated.orderNumber,
        customerName: updated.customer.name,
        customerEmail: updated.customer.email,
        status: updated.status,
        carrier: updated.carrier,
        service: updated.service,
        trackingNumber: updated.trackingNumber,
        trackingUrl: updated.trackingUrl,
      }),
    );
  }
  return json({ order: updated, emailed });
};

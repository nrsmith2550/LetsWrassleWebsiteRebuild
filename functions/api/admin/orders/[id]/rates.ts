import { guard } from '../../../../../shared/adminAuth';
import { rowToOrder } from '../../../../../shared/db';
import { parseParcel } from '../../../../../shared/package';
import { json, type Ctx } from '../../../../../shared/server';
import { getRates, ShippoError } from '../../../../../shared/shippo';

/** POST /api/admin/orders/:id/rates  { weightOz, lengthIn, widthIn, heightIn } */
export const onRequestPost = async (ctx: Ctx) => {
  const denied = await guard(ctx);
  if (denied) return denied;
  if (!ctx.env.DB) return json({ error: 'Orders database is not connected.' }, 503);
  try {
    const row = await ctx.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(Number(ctx.params.id)).first();
    if (!row) return json({ error: 'Order not found.' }, 404);
    const o = rowToOrder(row);
    if (o.fulfillment !== 'SHIPPING' || !o.address) return json({ error: 'This is a Local Pickup order, so no label is needed.' }, 400);
    const parcel = parseParcel(await ctx.request.json().catch(() => ({})));
    const rates = await getRates(ctx.env, { ...o.address, name: o.customer.name, phone: o.customer.phone, email: o.customer.email }, parcel);
    return json({ rates });
  } catch (e: any) {
    return json({ error: e.message }, e instanceof ShippoError ? e.status : 400);
  }
};

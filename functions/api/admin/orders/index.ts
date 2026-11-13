import { guard } from '../../../../shared/adminAuth';
import { rowToOrder } from '../../../../shared/db';
import { json, type Ctx } from '../../../../shared/server';
import { shippoConfigured } from '../../../../shared/shippo';

/** GET /api/admin/orders?q=&status= */
export const onRequestGet = async (ctx: Ctx) => {
  const denied = await guard(ctx);
  if (denied) return denied;
  const { env, request } = ctx;
  if (!env.DB) return json({ error: 'Orders database is not connected.' }, 503);

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || '';
  const q = (url.searchParams.get('q') || '').trim();
  const like = `%${q}%`;

  const rows = await env.DB.prepare(
    `SELECT * FROM orders
     WHERE (?1 = '' OR status = ?1)
       AND (?2 = '' OR order_number LIKE ?3 OR customer_name LIKE ?3 OR customer_email LIKE ?3 OR customer_phone LIKE ?3)
     ORDER BY created_at DESC LIMIT 300`,
  )
    .bind(status, q, like)
    .all();

  const counts = await env.DB.prepare('SELECT status, COUNT(*) AS c FROM orders GROUP BY status').all<{ status: string; c: number }>();
  const total = await env.DB.prepare('SELECT COUNT(*) AS c, COALESCE(SUM(total_cents),0) AS cents FROM orders').first<{ c: number; cents: number }>();

  return json({
    orders: rows.results.map(rowToOrder),
    counts: Object.fromEntries(counts.results.map((r) => [r.status, r.c])),
    totals: { orders: total?.c ?? 0, revenueCents: total?.cents ?? 0 },
    labelsReady: shippoConfigured(env),
  });
};

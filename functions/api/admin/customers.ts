import { guard } from '../../../shared/adminAuth';
import { json, type Ctx } from '../../../shared/server';

/** GET /api/admin/customers: everyone who has ordered, grouped by email. */
export const onRequestGet = async (ctx: Ctx) => {
  const denied = await guard(ctx);
  if (denied) return denied;
  if (!ctx.env.DB) return json({ error: 'Orders database is not connected.' }, 503);
  const { results } = await ctx.env.DB.prepare(
    `SELECT MAX(customer_name) AS name, lower(customer_email) AS email, MAX(customer_phone) AS phone,
            COUNT(*) AS orders, SUM(total_cents) AS spentCents, MAX(created_at) AS lastOrder
     FROM orders GROUP BY lower(customer_email) ORDER BY lastOrder DESC LIMIT 500`,
  ).all();
  return json({ customers: results });
};

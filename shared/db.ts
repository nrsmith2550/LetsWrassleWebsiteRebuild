import type { Env } from './server';
import type { Address, OrderSummary, PricedLine } from './types';

export const ORDER_STATUSES = ['AWAITING', 'PROCESSING', 'SHIPPED', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface StoredOrder {
  id: number;
  orderNumber: string;
  paymentProvider: 'SQUARE' | 'STRIPE';
  paymentId: string;
  paymentStatus: string;
  status: OrderStatus;
  customer: { name: string; email: string; phone: string };
  fulfillment: 'SHIPPING' | 'LOCAL_PICKUP';
  address: Address | null;
  items: PricedLine[];
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  carrier: string | null;
  service: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  labelUrl: string | null;
  labelCostCents: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export function rowToOrder(r: any): StoredOrder {
  return {
    id: r.id,
    orderNumber: r.order_number,
    paymentProvider: r.payment_provider,
    paymentId: r.payment_id,
    paymentStatus: r.payment_status,
    status: r.status,
    customer: { name: r.customer_name, email: r.customer_email, phone: r.customer_phone },
    fulfillment: r.fulfillment,
    address: r.address_json ? JSON.parse(r.address_json) : null,
    items: JSON.parse(r.items_json),
    subtotalCents: r.subtotal_cents,
    shippingCents: r.shipping_cents,
    taxCents: r.tax_cents,
    totalCents: r.total_cents,
    carrier: r.carrier,
    service: r.service,
    trackingNumber: r.tracking_number,
    trackingUrl: r.tracking_url,
    labelUrl: r.label_url,
    labelCostCents: r.label_cost_cents,
    notes: r.notes || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * Saves a paid order. Returns true only when the row was newly inserted, so a retried
 * webhook (or double submit) cannot create a duplicate order or send duplicate emails.
 * If no database is bound (e.g. a local run), it returns true so emails still send.
 */
export async function saveOrder(env: Env, o: OrderSummary, paymentId: string): Promise<boolean> {
  if (!env.DB) return true;
  try {
    const res = await env.DB.prepare(
      `INSERT OR IGNORE INTO orders
       (order_number, payment_provider, payment_id, customer_name, customer_email, customer_phone,
        fulfillment, address_json, items_json, subtotal_cents, shipping_cents, tax_cents, total_cents)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
      .bind(
        o.orderNumber,
        o.provider,
        paymentId,
        o.customer.name,
        o.customer.email,
        o.customer.phone,
        o.fulfillment,
        o.address ? JSON.stringify(o.address) : null,
        JSON.stringify(o.lines),
        o.subtotalCents,
        o.shippingCents,
        o.taxCents,
        o.totalCents,
      )
      .run();
    return res.meta.changes === 1;
  } catch (err) {
    console.error('[db] failed to save order', o.orderNumber, err);
    return true; // the customer has paid: never block the confirmation email on a DB hiccup
  }
}

import type { OrderSummary } from './types';

export interface EmailEnv {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  OWNER_EMAIL?: string;
  SITE_URL?: string;
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const money = (c: number) => `$${(c / 100).toFixed(2)}`;

/** Sends through Resend's HTTPS API (Workers can't open SMTP sockets). Logs instead when no key is set. */
export async function sendEmail(env: EmailEnv, to: string, subject: string, html: string) {
  if (!to) return;
  if (!env.RESEND_API_KEY) {
    console.log(`[email:dev] to=${to} subject=${subject}`);
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM || "Let's Wrassle Apparel <onboarding@resend.dev>", to: [to], subject, html }),
    });
    if (!res.ok) console.error('[email] Resend error', res.status, await res.text());
  } catch (err) {
    console.error('[email] failed', err);
  }
}

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f3f1ee;font-family:Helvetica,Arial,sans-serif;color:#1b1d20">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:6px;overflow:hidden">
    <tr><td style="background:#1b1d20;padding:20px 28px;color:#fff;font-size:22px;font-weight:900;letter-spacing:2px;text-transform:uppercase">Let's <span style="color:#e8731f">Wrassle</span></td></tr>
    <tr><td style="padding:28px"><h1 style="margin:0 0 16px;font-size:22px">${esc(title)}</h1>${body}</td></tr>
    <tr><td style="padding:16px 28px;background:#faf8f5;font-size:12px;color:#777">Questions? Contact support@letswrassleapparel.com<br/>© Let's Wrassle, Co.</td></tr>
  </table></td></tr></table></body></html>`;
}

function itemsTable(o: OrderSummary) {
  const rows = o.lines
    .map(
      (l) => `<tr><td style="padding:6px 0;border-bottom:1px solid #eee">${esc(l.productName)}<br/><span style="color:#777;font-size:12px">${esc(l.variantSummary)}</span></td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee" align="center">×${l.quantity}</td>
      <td style="padding:6px 0;border-bottom:1px solid #eee" align="right">${money(l.unitPriceCents * l.quantity)}</td></tr>`,
    )
    .join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${rows}
  <tr><td colspan="2" align="right" style="padding-top:8px">Subtotal</td><td align="right" style="padding-top:8px">${money(o.subtotalCents)}</td></tr>
  <tr><td colspan="2" align="right">Shipping</td><td align="right">${money(o.shippingCents)}</td></tr>
  <tr><td colspan="2" align="right">Tax</td><td align="right">${money(o.taxCents)}</td></tr>
  <tr><td colspan="2" align="right" style="font-weight:bold;padding-top:6px">Total</td><td align="right" style="font-weight:bold;padding-top:6px">${money(o.totalCents)}</td></tr></table>`;
}

function addressBlock(o: OrderSummary) {
  if (o.fulfillment === 'LOCAL_PICKUP' || !o.address) return '<strong>Local Pickup</strong> (we will coordinate with you)';
  const a = o.address;
  return `${esc(a.line1)}${a.line2 ? '<br/>' + esc(a.line2) : ''}<br/>${esc(a.city)}, ${esc(a.state)} ${esc(a.postalCode)}<br/>${esc(a.country)}`;
}

const STATUS_COPY: Record<string, string> = {
  PROCESSING: 'Good news: we are now preparing your order.',
  SHIPPED: 'Your order is on its way!',
  READY_FOR_PICKUP: 'Your order is ready for pickup! We will coordinate the details with you.',
  DELIVERED: 'Your order has been delivered. Thanks for repping Let’s Wrassle!',
  CANCELLED: 'Your order has been cancelled. If you did not expect this, please contact us.',
};

export interface StatusEmailOrder {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  carrier?: string | null;
  service?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
}

/** Customer update when the owner changes an order's status (includes tracking once shipped). */
export async function sendStatusEmail(env: EmailEnv, o: StatusEmailOrder, note?: string) {
  const copy = STATUS_COPY[o.status];
  if (!copy) return;
  const tracking = o.trackingNumber
    ? `<p><strong>Tracking:</strong> ${o.trackingUrl ? `<a href="${esc(o.trackingUrl)}" style="color:#e8731f">${esc(o.trackingNumber)}</a>` : esc(o.trackingNumber)}
       ${o.carrier ? `(${esc(o.carrier)} ${esc(o.service || '')})` : ''}</p>`
    : '';
  const html = layout(
    `Order ${o.orderNumber}: ${o.status.replace(/_/g, ' ').toLowerCase()}`,
    `<p>Hi ${esc(o.customerName.split(' ')[0])},</p><p>${esc(copy)}</p>
     ${note ? `<p style="background:#faf8f5;border-left:4px solid #e8731f;padding:10px 14px">${esc(note)}</p>` : ''}${tracking}`,
  );
  await sendEmail(env, o.customerEmail, `Order ${o.orderNumber} update: ${o.status.replace(/_/g, ' ').toLowerCase()}`, html);
}

/** Owner alert + customer confirmation. */
export async function sendOrderEmails(env: EmailEnv, o: OrderSummary) {
  const customerHtml = layout(
    `Thanks for your order, ${o.customer.name.split(' ')[0]}!`,
    `<p>Your order <strong>${esc(o.orderNumber)}</strong> is confirmed. Orders are processed within 2–3 business days, and you'll get tracking by email once it ships.</p>
     ${itemsTable(o)}
     <p style="margin-top:20px"><strong>${o.fulfillment === 'LOCAL_PICKUP' ? 'Pickup' : 'Ship to'}:</strong><br/>${addressBlock(o)}</p>`,
  );
  const ownerHtml = layout(
    `New order ${o.orderNumber} – ${money(o.totalCents)}`,
    `<p><strong>Customer</strong><br/>Name: ${esc(o.customer.name)}<br/>
      Phone: <a href="tel:${esc(o.customer.phone)}">${esc(o.customer.phone)}</a><br/>
      Email: <a href="mailto:${esc(o.customer.email)}">${esc(o.customer.email)}</a></p>
     <p><strong>${o.fulfillment === 'LOCAL_PICKUP' ? 'Local Pickup' : 'Ship to'}</strong><br/>${addressBlock(o)}</p>
     ${itemsTable(o)}
     <p>Paid via ${esc(o.provider)}. Find the payment in your ${o.provider === 'SQUARE' ? 'Square' : 'Stripe'} dashboard.</p>`,
  );
  await Promise.all([
    sendEmail(env, o.customer.email, `Order confirmed – ${o.orderNumber}`, customerHtml),
    env.OWNER_EMAIL ? sendEmail(env, env.OWNER_EMAIL, `New order ${o.orderNumber} from ${o.customer.name}`, ownerHtml) : Promise.resolve(),
  ]);
}

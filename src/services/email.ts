import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
import { parseJson } from '../utils';

/**
 * Email via Nodemailer. Works with any SMTP server or transactional-email SMTP
 * relay. With SMTP_HOST unset, messages are printed to the console (dev mode).
 */
let transporter: Transporter | null = null;
function getTransporter() {
  if (!config.email.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: config.email.user ? { user: config.email.user, pass: config.email.pass } : undefined,
    });
  }
  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!to) return;
  const t = getTransporter();
  if (!t) {
    console.log(`\n[email:dev] To: ${to}\n[email:dev] Subject: ${subject}\n`);
    return;
  }
  try {
    await t.sendMail({ from: config.email.from, to, subject, html });
  } catch (err) {
    console.error('[email] failed to send', subject, 'to', to, err);
  }
}

const esc = (s: any) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const money = (c: number) => `$${(c / 100).toFixed(2)}`;

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f3f1ee;font-family:Helvetica,Arial,sans-serif;color:#1b1d20">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:6px;overflow:hidden">
      <tr><td style="background:#1b1d20;padding:20px 28px;color:#fff;font-size:22px;font-weight:900;letter-spacing:2px;text-transform:uppercase">
        Let's <span style="color:#e8731f">Wrassle</span></td></tr>
      <tr><td style="padding:28px">
        <h1 style="margin:0 0 16px;font-size:22px">${esc(title)}</h1>${body}
      </td></tr>
      <tr><td style="padding:16px 28px;background:#faf8f5;font-size:12px;color:#777">
        Questions? Reply to this email or contact support@letswrassleapparel.com<br/>© Let's Wrassle, Co.
      </td></tr>
    </table></td></tr></table></body></html>`;
}

function itemsTable(o: any) {
  const rows = (o.items || [])
    .map(
      (i: any) => `<tr><td style="padding:6px 0;border-bottom:1px solid #eee">${esc(i.productName)}<br/>
      <span style="color:#777;font-size:12px">${esc(i.variantSummary)}</span></td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee" align="center">×${i.quantity}</td>
      <td style="padding:6px 0;border-bottom:1px solid #eee" align="right">${money(i.unitPriceCents * i.quantity)}</td></tr>`,
    )
    .join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${rows}
    <tr><td colspan="2" align="right" style="padding-top:8px">Subtotal</td><td align="right" style="padding-top:8px">${money(o.subtotalCents)}</td></tr>
    <tr><td colspan="2" align="right">Shipping</td><td align="right">${money(o.shippingCents)}</td></tr>
    <tr><td colspan="2" align="right">Tax</td><td align="right">${money(o.taxCents)}</td></tr>
    <tr><td colspan="2" align="right" style="font-weight:bold;padding-top:6px">Total</td><td align="right" style="font-weight:bold;padding-top:6px">${money(o.totalCents)}</td></tr></table>`;
}

function addressBlock(o: any) {
  if (o.fulfillmentMethod === 'LOCAL_PICKUP') return '<strong>Local Pickup</strong> (we will coordinate with you)';
  const a = parseJson<any>(o.shippingAddressJson, null);
  if (!a) return '';
  return `${esc(a.line1)}${a.line2 ? '<br/>' + esc(a.line2) : ''}<br/>${esc(a.city)}, ${esc(a.state)} ${esc(a.postalCode)}<br/>${esc(a.country || 'US')}`;
}

export async function sendOrderConfirmation(o: any) {
  const html = layout(
    `Thanks for your order, ${o.customerName.split(' ')[0]}!`,
    `<p>Your order <strong>${esc(o.orderNumber)}</strong> is confirmed. Orders are processed within 2–3 business days.</p>
     ${itemsTable(o)}
     <p style="margin-top:20px"><strong>${o.fulfillmentMethod === 'LOCAL_PICKUP' ? 'Pickup' : 'Ship to'}:</strong><br/>${addressBlock(o)}</p>
     <p><a href="${config.siteUrl}/account/orders" style="color:#e8731f">View your orders</a></p>`,
  );
  await sendEmail(o.customerEmail, `Order confirmed – ${o.orderNumber}`, html);
}

export async function sendOwnerNewOrder(o: any) {
  const to = config.email.ownerEmail;
  if (!to) return;
  const html = layout(
    `New order ${o.orderNumber} – ${money(o.totalCents)}`,
    `<p><strong>Customer</strong><br/>Name: ${esc(o.customerName)}<br/>
      Phone: <a href="tel:${esc(o.customerPhone)}">${esc(o.customerPhone)}</a><br/>
      Email: <a href="mailto:${esc(o.customerEmail)}">${esc(o.customerEmail)}</a></p>
     <p><strong>${o.fulfillmentMethod === 'LOCAL_PICKUP' ? 'Local Pickup' : 'Ship to'}</strong><br/>${addressBlock(o)}</p>
     ${itemsTable(o)}
     <p>Paid via ${esc(o.paymentProvider)}.</p>
     <p><a href="${config.siteUrl}/admin/orders/${o.id}" style="color:#e8731f">Open in Admin Hub</a></p>`,
  );
  await sendEmail(to, `🛒 New order ${o.orderNumber} from ${o.customerName}`, html);
}

const STATUS_COPY: Record<string, string> = {
  PENDING: 'Your order has been received and is pending.',
  PROCESSING: 'Good news — we are now preparing your order.',
  READY_FOR_PICKUP: 'Your order is ready for pickup! We will coordinate the details with you.',
  SHIPPED: 'Your order is on its way!',
  DELIVERED: 'Your order has been delivered. Thanks for repping Let’s Wrassle!',
  CANCELLED: 'Your order has been cancelled. If you did not expect this, please contact us.',
};

export async function sendStatusUpdate(o: any, note?: string) {
  const tracking = o.trackingNumber
    ? `<p><strong>Tracking:</strong> ${o.trackingUrl ? `<a href="${esc(o.trackingUrl)}" style="color:#e8731f">${esc(o.trackingNumber)}</a>` : esc(o.trackingNumber)}
       ${o.shippingCarrier ? `(${esc(o.shippingCarrier)} ${esc(o.shippingService)})` : ''}</p>`
    : '';
  const html = layout(
    `Order ${o.orderNumber}: ${o.orderStatus.replace(/_/g, ' ')}`,
    `<p>${esc(STATUS_COPY[o.orderStatus] || 'Your order status was updated.')}</p>
     ${note ? `<p style="background:#faf8f5;border-left:4px solid #e8731f;padding:10px 14px">${esc(note)}</p>` : ''}
     ${tracking}
     <p><a href="${config.siteUrl}/account/orders" style="color:#e8731f">View your orders</a></p>`,
  );
  await sendEmail(o.customerEmail, `Order ${o.orderNumber} update: ${o.orderStatus.replace(/_/g, ' ')}`, html);
}

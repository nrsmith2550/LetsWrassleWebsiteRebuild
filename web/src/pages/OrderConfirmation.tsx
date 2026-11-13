import { Link, useLocation } from 'react-router-dom';
import { money } from '../lib/api';

export default function OrderConfirmation() {
  const order = (useLocation().state as any)?.order;
  if (!order) {
    return <div className="p-20 text-center"><h1 className="text-3xl">Thank you!</h1><p className="mt-2 text-gray-600">Check your email for your order confirmation.</p><Link to="/shop" className="btn-primary mt-6">Keep shopping</Link></div>;
  }
  return (
    <div className="mx-auto max-w-xl px-4 py-14">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700">✓</div>
        <h1 className="text-3xl">Order confirmed!</h1>
        <p className="mt-2 text-gray-600">Order <b>{order.orderNumber}</b> — a confirmation was sent to {order.customerEmail}.</p>
      </div>
      <div className="card mt-8 text-sm">
        <ul className="divide-y">
          {order.items.map((i: any, n: number) => (
            <li key={n} className="flex justify-between py-2"><span>{i.productName} <span className="text-gray-500">— {i.variantSummary} × {i.quantity}</span></span><span>{money(i.unitPriceCents * i.quantity)}</span></li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t pt-3">
          <div className="flex justify-between"><span>Subtotal</span><span>{money(order.subtotalCents)}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>{money(order.shippingCents)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{money(order.taxCents)}</span></div>
          <div className="flex justify-between text-base font-bold"><span>Total</span><span>{money(order.totalCents)}</span></div>
        </div>
        <p className="mt-4 text-gray-600">{order.fulfillmentMethod === 'LOCAL_PICKUP' ? 'We will reach out to coordinate your local pickup.' : 'Orders ship within 2–3 business days. You will get an email with tracking.'}</p>
      </div>
      <div className="mt-6 text-center"><Link to="/shop" className="btn-primary">Keep shopping</Link></div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import { api, money, Order } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function Account() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api<{ orders: Order[] }>('/account/orders').then((r) => setOrders(r.orders)).catch((e) => setErr(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl">My Orders</h1>
      <p className="mt-1 text-sm text-gray-600">{user?.name} · {user?.email}</p>

      {err && <p className="mt-6 text-red-600">{err}</p>}
      {!orders && !err && <p className="mt-10 text-center text-gray-500">Loading…</p>}
      {orders?.length === 0 && (
        <div className="mt-10 text-center text-gray-500"><p>No orders yet.</p><Link to="/shop" className="btn-primary mt-4">Start shopping</Link></div>
      )}

      <div className="mt-6 space-y-4">
        {orders?.map((o) => (
          <div key={o.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-display text-lg">{o.orderNumber}</div>
                <div className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</div>
              </div>
              <StatusBadge status={o.orderStatus} />
            </div>
            <ul className="mt-3 divide-y text-sm">
              {o.items.map((i, idx) => (
                <li key={idx} className="flex justify-between py-2">
                  <span>{i.productName} <span className="text-gray-500">— {i.variantSummary} × {i.quantity}</span></span>
                  <span>{money(i.unitPriceCents * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
              <div>
                {o.fulfillmentMethod === 'LOCAL_PICKUP' ? <span className="text-gray-600">Local pickup</span> : o.trackingNumber ? (
                  <span>
                    {o.shippingCarrier} tracking:{' '}
                    {o.trackingUrl ? <a href={o.trackingUrl} target="_blank" rel="noreferrer" className="font-bold text-orange underline">{o.trackingNumber}</a> : <b>{o.trackingNumber}</b>}
                  </span>
                ) : <span className="text-gray-600">Tracking will appear once shipped</span>}
              </div>
              <div className="font-bold">Total paid: {money(o.totalCents)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

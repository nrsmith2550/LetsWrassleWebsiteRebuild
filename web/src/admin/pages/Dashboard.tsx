import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, PageTitle } from '../AdminShell';
import { adminApi, fmtDate, money, shortNumber, STATUS, StoredOrder } from '../adminApi';

interface Resp {
  orders: StoredOrder[];
  counts: Record<string, number>;
  totals: { orders: number; revenueCents: number };
  labelsReady: boolean;
}

export default function Dashboard() {
  const [d, setD] = useState<Resp | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    adminApi<Resp>('/orders').then(setD).catch((e) => setErr(e.message));
  }, []);

  if (err) return <p className="text-ionos-red">{err}</p>;
  if (!d) return <p className="text-ionos-muted">Loading…</p>;

  const todo = (d.counts.AWAITING || 0) + (d.counts.PROCESSING || 0);
  const stat = (title: string, value: string, to?: string, tone = 'text-ionos-text') => (
    <Card>
      <div className="text-xs font-bold uppercase tracking-wide text-ionos-muted">{title}</div>
      <div className={`mt-2 text-3xl font-bold ${tone}`}>{value}</div>
      {to && <Link to={to} className="mt-2 inline-block text-sm font-semibold text-ionos-primary hover:underline">View</Link>}
    </Card>
  );

  return (
    <div>
      <PageTitle>Dashboard</PageTitle>

      {!d.labelsReady && (
        <div className="mb-5 rounded-lg border border-ionos-amber/30 bg-amber-50 p-4 text-sm">
          <b>Shipping labels aren't connected yet.</b> Add your Shippo key and ship-from address to buy and print labels with one click. Everything else works.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stat('Orders to fulfill', String(todo), '/admin/orders', todo ? 'text-ionos-amber' : 'text-ionos-text')}
        {stat('Shipped', String(d.counts.SHIPPED || 0))}
        {stat('All orders', String(d.totals.orders), '/admin/orders')}
        {stat('Total sales', money(d.totals.revenueCents))}
      </div>

      <Card className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-sans text-lg font-bold normal-case tracking-normal">Recent orders</h2>
          <Link to="/admin/orders" className="text-sm font-semibold text-ionos-primary hover:underline">All orders</Link>
        </div>
        {d.orders.length === 0 ? (
          <p className="py-8 text-center text-ionos-muted">No orders yet. New paid orders show up here automatically.</p>
        ) : (
          <ul className="divide-y divide-ionos-line">
            {d.orders.slice(0, 6).map((o) => (
              <li key={o.id}>
                <Link to={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-ionos-page/60">
                  <div>
                    <div className="font-bold">#{shortNumber(o.orderNumber)} <span className="ml-2 text-sm font-normal text-ionos-muted">{fmtDate(o.createdAt)}</span></div>
                    <div className="text-sm text-ionos-muted">{o.customer.name} · {o.fulfillment === 'LOCAL_PICKUP' ? 'Pickup' : 'Shipping'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{money(o.totalCents)}</div>
                    <div className={`text-sm font-semibold ${STATUS[o.status]?.tone}`}>{STATUS[o.status]?.label}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

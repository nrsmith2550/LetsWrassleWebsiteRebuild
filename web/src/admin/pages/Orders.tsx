import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, field, PageTitle } from '../AdminShell';
import { adminApi, fmtDate, money, shortNumber, STATUS, STATUS_ORDER, StoredOrder } from '../adminApi';

interface Resp {
  orders: StoredOrder[];
  counts: Record<string, number>;
  totals: { orders: number };
}

export default function Orders() {
  const [data, setData] = useState<Resp | null>(null);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');

  const load = () => {
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (q.trim()) qs.set('q', q.trim());
    adminApi<Resp>(`/orders?${qs}`).then(setData).catch((e) => setErr(e.message));
  };
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [status, q]);

  async function setOrderStatus(o: StoredOrder, next: string) {
    try {
      // Quick changes from the list do not email the customer; open the order to send an update.
      await adminApi(`/orders/${o.id}`, { method: 'PATCH', body: { status: next, notify: false } });
      load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  const chip = (value: string, text: string, n?: number) => (
    <button
      key={value}
      onClick={() => setStatus(value)}
      className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold ${status === value ? 'bg-ionos-primary text-white' : 'bg-white text-ionos-text hover:bg-ionos-line/60'}`}
    >
      {text}{n !== undefined ? ` (${n})` : ''}
    </button>
  );

  return (
    <div>
      <PageTitle>Orders</PageTitle>
      <input className={`${field} mb-3`} placeholder="Search order #, customer name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {chip('', 'All', data?.totals.orders)}
        {STATUS_ORDER.map((s) => chip(s, STATUS[s].label, data?.counts[s] || 0))}
      </div>

      {err && <p className="mb-3 text-ionos-red">{err}</p>}
      {!data ? (
        <p className="text-ionos-muted">Loading…</p>
      ) : data.orders.length === 0 ? (
        <Card><p className="py-10 text-center text-ionos-muted">{q || status ? 'No orders match.' : 'No orders yet. New paid orders show up here automatically.'}</p></Card>
      ) : (
        <div className="space-y-3">
          {data.orders.map((o) => (
            <Card key={o.id} className="!p-0">
              <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                <Link to={`/admin/orders/${o.id}`} className="min-w-0 flex-1">
                  <div className="text-lg font-bold">#{shortNumber(o.orderNumber)} <span className="ml-2 text-sm font-normal text-ionos-muted">{fmtDate(o.createdAt)}</span></div>
                  <div className="mt-1 text-sm">
                    <span className="font-semibold text-ionos-green">Paid</span>
                    <span className="mx-2 text-ionos-line">|</span>
                    <span className={`font-semibold ${STATUS[o.status]?.tone}`}>{STATUS[o.status]?.label}</span>
                  </div>
                  <div className="mt-2 text-sm">
                    <b>{o.customer.name}</b> <span className="text-ionos-primary">{o.customer.email}</span>
                    <div className="text-ionos-muted">Phone {o.customer.phone}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ionos-muted">
                    <span>{o.fulfillment === 'LOCAL_PICKUP' ? 'Local pickup' : o.address ? `Ship to ${o.address.city}, ${o.address.state}` : 'Shipping'}</span>
                    <span>{o.paymentProvider === 'SQUARE' ? 'Card (Square)' : 'Wallet (Stripe)'}</span>
                    {o.trackingNumber && <span>Tracking {o.trackingNumber}</span>}
                  </div>
                  <ul className="mt-2 text-sm text-ionos-text">
                    {o.items.map((l, i) => (
                      <li key={i}>{l.quantity} × {l.productName} <span className="text-ionos-muted">({l.variantSummary})</span></li>
                    ))}
                  </ul>
                </Link>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-xl font-bold">{money(o.totalCents)}</div>
                  <select
                    className="rounded border border-ionos-line bg-white px-2 py-1.5 text-sm font-semibold"
                    value={o.status}
                    onChange={(e) => setOrderStatus(o, e.target.value)}
                    aria-label="Update status"
                  >
                    {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
                  </select>
                  <Link to={`/admin/orders/${o.id}`} className="text-sm font-semibold text-ionos-primary hover:underline">Open order →</Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

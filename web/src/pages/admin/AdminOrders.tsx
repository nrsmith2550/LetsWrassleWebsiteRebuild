import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge';
import { api, money, Order, STATUS_LABEL } from '../../lib/api';

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [status, setStatus] = useState('');
  const [gateway, setGateway] = useState('');
  const [q, setQ] = useState('');
  const [unpaid, setUnpaid] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      const qs = new URLSearchParams();
      if (status) qs.set('status', status);
      if (gateway) qs.set('payment', gateway);
      if (q) qs.set('q', q);
      if (unpaid) qs.set('includeUnpaid', 'true');
      api<{ orders: Order[] }>(`/admin/orders?${qs}`).then((r) => setOrders(r.orders)).catch((e) => setErr(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [status, gateway, q, unpaid]);

  return (
    <div>
      <h1 className="mb-6 text-3xl">Orders</h1>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input className="input sm:w-72" placeholder="Search order #, name, email, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input sm:w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input sm:w-40" value={gateway} onChange={(e) => setGateway(e.target.value)}>
          <option value="">All gateways</option><option value="STRIPE">Stripe</option><option value="SQUARE">Square</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={unpaid} onChange={(e) => setUnpaid(e.target.checked)} /> Show unpaid / abandoned</label>
      </div>

      {err && <p className="text-red-600">{err}</p>}
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-gray-100 text-xs uppercase tracking-wider text-gray-600">
            <tr>{['Order', 'Date', 'Customer', 'Phone', 'Email', 'Total', 'Gateway', 'Status'].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {orders?.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-3 py-3 font-bold"><Link to={`/admin/orders/${o.id}`} className="text-orange hover:underline">{o.orderNumber}</Link></td>
                <td className="px-3 py-3 whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-3">{o.customerName}{o.fulfillmentMethod === 'LOCAL_PICKUP' && <span className="badge ml-2 bg-purple-100 text-purple-800">Pickup</span>}</td>
                <td className="px-3 py-3 whitespace-nowrap"><a href={`tel:${o.customerPhone}`} className="hover:text-orange">{o.customerPhone}</a></td>
                <td className="px-3 py-3"><a href={`mailto:${o.customerEmail}`} className="hover:text-orange">{o.customerEmail}</a></td>
                <td className="px-3 py-3 font-semibold">{money(o.totalCents)}</td>
                <td className="px-3 py-3">{o.paymentProvider}{o.paymentStatus !== 'PAID' && <span className="badge ml-1 bg-red-100 text-red-800">{o.paymentStatus}</span>}</td>
                <td className="px-3 py-3"><StatusBadge status={o.orderStatus} /></td>
              </tr>
            ))}
            {orders && orders.length === 0 && <tr><td colSpan={8} className="px-3 py-10 text-center text-gray-500">No orders found.</td></tr>}
            {!orders && <tr><td colSpan={8} className="px-3 py-10 text-center text-gray-500">Loading…</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

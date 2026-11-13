import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge';
import { api, money, Order, STATUS_LABEL } from '../../lib/api';

interface Rate { id: string; provider: string; service: string; amountCents: number; estimatedDays: number | null; durationTerms: string }

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');

  const [pkg, setPkg] = useState({ lbs: '0', oz: '8', l: '10', w: '8', h: '1' });
  const [rates, setRates] = useState<Rate[]>([]);
  const [rateId, setRateId] = useState('');
  const [labelErr, setLabelErr] = useState('');

  useEffect(() => {
    api<{ order: Order; packageDefaults: { weightOz: number; lengthIn: number; widthIn: number; heightIn: number } }>(`/admin/orders/${id}`)
      .then((r) => {
        setOrder(r.order);
        setStatus(r.order.orderStatus);
        const d = r.packageDefaults;
        setPkg({ lbs: String(Math.floor(d.weightOz / 16)), oz: String(Math.round((d.weightOz % 16) * 10) / 10), l: String(d.lengthIn), w: String(d.widthIn), h: String(d.heightIn) });
      })
      .catch((e) => setErr(e.message));
  }, [id]);

  const parcel = () => ({ weightLbs: Number(pkg.lbs) || 0, weightOz: Number(pkg.oz) || 0, lengthIn: Number(pkg.l), widthIn: Number(pkg.w), heightIn: Number(pkg.h) });

  async function updateStatus() {
    setBusy('status'); setMsg(''); setErr('');
    try {
      const r = await api<{ order: Order }>(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status, note: note || undefined } });
      setOrder(r.order); setNote('');
      setMsg(`Status updated and customer emailed (${r.order.customerEmail}).`);
    } catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }

  async function fetchRates() {
    setBusy('rates'); setLabelErr(''); setRates([]); setRateId('');
    try {
      const r = await api<{ rates: Rate[] }>(`/admin/orders/${id}/shipping-rates`, { body: parcel() });
      setRates(r.rates); setRateId(r.rates[0]?.id || '');
    } catch (e: any) { setLabelErr(e.message); } finally { setBusy(''); }
  }

  async function buyLabel() {
    // Open the tab synchronously so popup blockers allow it, then point it at the PDF.
    const tab = window.open('', '_blank');
    setBusy('label'); setLabelErr('');
    try {
      const r = await api<{ order: Order; label: { labelUrl: string } }>(`/admin/orders/${id}/purchase-label`, { body: { ...parcel(), rateId } });
      setOrder(r.order); setStatus(r.order.orderStatus); setRates([]);
      setMsg('Label purchased. Order marked SHIPPED and customer emailed their tracking number.');
      if (tab) tab.location.href = r.label.labelUrl;
    } catch (e: any) { tab?.close(); setLabelErr(e.message); } finally { setBusy(''); }
  }

  if (err && !order) return <p className="text-red-600">{err}</p>;
  if (!order) return <p className="text-gray-500">Loading…</p>;
  const a = order.shippingAddress;
  const pk = (k: keyof typeof pkg) => (e: any) => setPkg({ ...pkg, [k]: e.target.value });

  return (
    <div>
      <Link to="/admin/orders" className="text-sm text-gray-500 hover:text-orange">← All orders</Link>
      <div className="mb-6 mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">{order.orderNumber}</h1>
        <StatusBadge status={order.orderStatus} />
        <span className="badge bg-gray-200">{order.paymentProvider} · {order.paymentStatus}</span>
        <span className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleString()}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 text-lg">Customer</h2>
          <dl className="space-y-1 text-sm">
            <div><b>Name:</b> {order.customerName}</div>
            <div><b>Phone:</b> <a className="text-orange underline" href={`tel:${order.customerPhone}`}>{order.customerPhone}</a></div>
            <div><b>Email:</b> <a className="text-orange underline" href={`mailto:${order.customerEmail}`}>{order.customerEmail}</a></div>
            <div className="pt-2"><b>{order.fulfillmentMethod === 'LOCAL_PICKUP' ? 'Fulfillment:' : 'Ship to:'}</b></div>
            {order.fulfillmentMethod === 'LOCAL_PICKUP' ? <div className="rounded bg-purple-50 p-2">Local pickup — coordinate with the customer.</div> : a && (
              <address className="not-italic">{a.line1}<br />{a.line2 && <>{a.line2}<br /></>}{a.city}, {a.state} {a.postalCode}<br />{a.country || 'US'}</address>
            )}
          </dl>
        </section>

        <section className="card">
          <h2 className="mb-3 text-lg">Items</h2>
          <ul className="divide-y text-sm">
            {order.items.map((i, n) => <li key={n} className="flex justify-between py-2"><span>{i.productName}<br /><span className="text-gray-500">{i.variantSummary} × {i.quantity}</span></span><span>{money(i.unitPriceCents * i.quantity)}</span></li>)}
          </ul>
          <div className="mt-2 space-y-1 border-t pt-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{money(order.subtotalCents)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{money(order.shippingCents)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{money(order.taxCents)}</span></div>
            <div className="flex justify-between font-bold"><span>Total</span><span>{money(order.totalCents)}</span></div>
          </div>
          {order.paymentTransactionId && <div className="mt-2 break-all text-xs text-gray-400">Txn: {order.paymentTransactionId}</div>}
        </section>

        <section className="card">
          <h2 className="mb-3 text-lg">Status &amp; notify customer</h2>
          <label className="label">Order status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label className="label mt-3">Note to customer (optional)</label>
          <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Your order is ready — text me to set up a time." />
          <button className="btn-primary mt-3" disabled={busy === 'status' || status === order.orderStatus && !note} onClick={updateStatus}>
            {busy === 'status' ? 'Saving…' : 'Update status & email customer'}
          </button>
          {msg && <p className="mt-3 text-sm text-green-700">{msg}</p>}
          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        </section>

        {order.fulfillmentMethod === 'SHIPPING' && (
          <section className="card">
            <h2 className="mb-3 text-lg">Shipping label</h2>
            {order.trackingNumber && (
              <div className="mb-4 rounded bg-green-50 p-3 text-sm">
                <div><b>{order.shippingCarrier}</b> {order.shippingService}</div>
                <div>Tracking: {order.trackingUrl ? <a className="text-orange underline" target="_blank" rel="noreferrer" href={order.trackingUrl}>{order.trackingNumber}</a> : order.trackingNumber}</div>
                {order.shippingLabelPdfUrl && <a className="btn-outline btn-sm mt-2" target="_blank" rel="noreferrer" href={order.shippingLabelPdfUrl}>Reprint 4×6 label</a>}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Weight (lbs)</label><input className="input" type="number" min="0" step="1" value={pkg.lbs} onChange={pk('lbs')} /></div>
              <div><label className="label">Weight (oz)</label><input className="input" type="number" min="0" step="0.1" value={pkg.oz} onChange={pk('oz')} /></div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div><label className="label">Length (in)</label><input className="input" type="number" min="0" step="0.1" value={pkg.l} onChange={pk('l')} /></div>
              <div><label className="label">Width (in)</label><input className="input" type="number" min="0" step="0.1" value={pkg.w} onChange={pk('w')} /></div>
              <div><label className="label">Height (in)</label><input className="input" type="number" min="0" step="0.1" value={pkg.h} onChange={pk('h')} /></div>
            </div>
            <p className="mt-1 text-xs text-gray-500">Pre-filled from the products' default weight &amp; dimensions — edit as needed.</p>
            <button className="btn-outline mt-3" disabled={busy === 'rates'} onClick={fetchRates}>{busy === 'rates' ? 'Fetching…' : 'Fetch live shipping rates'}</button>

            {rates.length > 0 && (
              <div className="mt-4 space-y-2">
                {rates.map((r) => (
                  <label key={r.id} className={`flex cursor-pointer items-center gap-3 rounded border-2 p-3 text-sm ${rateId === r.id ? 'border-ink' : 'border-gray-200'}`}>
                    <input type="radio" name="rate" checked={rateId === r.id} onChange={() => setRateId(r.id)} />
                    <span className="flex-1"><b>{r.provider}</b> {r.service}<br /><span className="text-gray-500">{r.estimatedDays ? `~${r.estimatedDays} day(s)` : r.durationTerms}</span></span>
                    <b>{money(r.amountCents)}</b>
                  </label>
                ))}
                <button className="btn-orange w-full" disabled={!rateId || busy === 'label'} onClick={buyLabel}>{busy === 'label' ? 'Buying…' : 'Buy & print label'}</button>
              </div>
            )}
            {labelErr && <p className="mt-3 text-sm text-red-600">{labelErr}</p>}
          </section>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { btnOutline, btnPrimary, Card, field, label, PageTitle } from '../AdminShell';
import { adminApi, fmtDate, money, STATUS, STATUS_ORDER, StoredOrder } from '../adminApi';

interface Rate { id: string; provider: string; service: string; amountCents: number; estimatedDays: number | null }
interface Parcel { weightOz: number; lengthIn: number; widthIn: number; heightIn: number }

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [labelsReady, setLabelsReady] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const [status, setStatus] = useState('');
  const [notify, setNotify] = useState(true);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState('');

  // package form (pounds + ounces for the weight, like a postage scale)
  const [lb, setLb] = useState('0');
  const [oz, setOz] = useState('8');
  const [dims, setDims] = useState({ l: '10', w: '8', h: '2' });
  const [rates, setRates] = useState<Rate[]>([]);
  const [rateId, setRateId] = useState('');
  const [labelErr, setLabelErr] = useState('');

  useEffect(() => {
    adminApi<{ order: StoredOrder; parcel: Parcel | null; labelsReady: boolean }>(`/orders/${id}`)
      .then((r) => {
        setOrder(r.order);
        setStatus(r.order.status);
        setNotes(r.order.notes);
        setLabelsReady(r.labelsReady);
        if (r.parcel) {
          setLb(String(Math.floor(r.parcel.weightOz / 16)));
          setOz(String(Math.round((r.parcel.weightOz % 16) * 10) / 10));
          setDims({ l: String(r.parcel.lengthIn), w: String(r.parcel.widthIn), h: String(r.parcel.heightIn) });
        }
      })
      .catch((e) => setErr(e.message));
  }, [id]);

  const parcel = () => ({
    weightOz: (Number(lb) || 0) * 16 + (Number(oz) || 0),
    lengthIn: Number(dims.l),
    widthIn: Number(dims.w),
    heightIn: Number(dims.h),
  });

  async function saveStatus() {
    setBusy('status'); setMsg(''); setErr('');
    try {
      const r = await adminApi<{ order: StoredOrder; emailed: boolean }>(`/orders/${id}`, { method: 'PATCH', body: { status, notify } });
      setOrder(r.order);
      setMsg(r.emailed ? `Status updated. ${r.order.customer.name} was emailed.` : 'Status updated.');
    } catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }

  async function saveNotes() {
    setBusy('notes'); setErr('');
    try {
      const r = await adminApi<{ order: StoredOrder }>(`/orders/${id}`, { method: 'PATCH', body: { notes } });
      setOrder(r.order); setMsg('Notes saved.');
    } catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }

  async function seeRates() {
    setBusy('rates'); setLabelErr(''); setRates([]); setRateId('');
    try {
      const r = await adminApi<{ rates: Rate[] }>(`/orders/${id}/rates`, { body: parcel() });
      setRates(r.rates); setRateId(r.rates[0]?.id || '');
    } catch (e: any) { setLabelErr(e.message); } finally { setBusy(''); }
  }

  /** One click: buy (cheapest, or the chosen rate), open the 4x6 label for printing, mark shipped, email tracking. */
  async function buyLabel(useChosen: boolean) {
    const tab = window.open('', '_blank'); // opened on the click so the browser allows it
    setBusy('label'); setLabelErr('');
    try {
      const r = await adminApi<{ order: StoredOrder; label: { labelUrl: string } }>(`/orders/${id}/label`, {
        body: { ...parcel(), ...(useChosen && rateId ? { rateId } : {}) },
      });
      setOrder(r.order); setStatus(r.order.status); setRates([]);
      setMsg('Label bought. The order is marked Shipped and the customer was emailed their tracking number.');
      if (tab) tab.location.href = r.label.labelUrl;
    } catch (e: any) { tab?.close(); setLabelErr(e.message); } finally { setBusy(''); }
  }

  if (err && !order) return <p className="text-ionos-red">{err}</p>;
  if (!order) return <p className="text-ionos-muted">Loading…</p>;
  const a = order.address;
  const pk = (k: 'l' | 'w' | 'h') => (e: any) => setDims({ ...dims, [k]: e.target.value });

  return (
    <div>
      <Link to="/admin/orders" className="text-sm font-semibold text-ionos-primary hover:underline print:hidden">← Orders</Link>
      <PageTitle
        right={
          <button className={`${btnOutline} print:hidden`} onClick={() => window.print()}>Print order</button>
        }
      >
        Order #{order.orderNumber.replace(/^LW-/, '')}
      </PageTitle>
      <div className="-mt-3 mb-5 text-sm text-ionos-muted">
        {fmtDate(order.createdAt)} ·{' '}
        <span className="font-semibold text-ionos-green">Paid</span> via {order.paymentProvider === 'SQUARE' ? 'Square' : 'Stripe'} ·{' '}
        <span className={`font-semibold ${STATUS[order.status]?.tone}`}>{STATUS[order.status]?.label}</span>
      </div>

      {(msg || err) && (
        <div className={`mb-4 rounded-lg p-3 text-sm ${err ? 'bg-red-50 text-ionos-red' : 'bg-green-50 text-ionos-green'} print:hidden`}>{err || msg}</div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
        <div className="space-y-5">
          <Card>
            <h2 className="mb-3 font-sans text-lg font-bold normal-case tracking-normal">Customer</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="text-sm leading-relaxed">
                <div className="text-base font-bold">{order.customer.name}</div>
                <a className="block text-ionos-primary hover:underline" href={`mailto:${order.customer.email}`}>{order.customer.email}</a>
                <a className="block text-ionos-primary hover:underline" href={`tel:${order.customer.phone}`}>{order.customer.phone}</a>
              </div>
              <div className="text-sm leading-relaxed">
                <div className="text-xs font-bold uppercase tracking-wide text-ionos-muted">{order.fulfillment === 'LOCAL_PICKUP' ? 'Fulfillment' : 'Ship to'}</div>
                {order.fulfillment === 'LOCAL_PICKUP' || !a ? (
                  <div className="mt-1 rounded bg-purple-50 p-2 text-purple-800">Local pickup. Coordinate a time with the customer.</div>
                ) : (
                  <address className="mt-1 not-italic">{order.customer.name}<br />{a.line1}<br />{a.line2 && <>{a.line2}<br /></>}{a.city}, {a.state} {a.postalCode}<br />{a.country}</address>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 font-sans text-lg font-bold normal-case tracking-normal">Items</h2>
            <ul className="divide-y divide-ionos-line text-sm">
              {order.items.map((l, i) => (
                <li key={i} className="flex justify-between gap-3 py-2.5">
                  <span><b>{l.productName}</b><br /><span className="text-ionos-muted">{l.variantSummary} × {l.quantity}</span></span>
                  <span className="font-semibold">{money(l.unitPriceCents * l.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-1 border-t border-ionos-line pt-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{money(order.subtotalCents)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{money(order.shippingCents)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{money(order.taxCents)}</span></div>
              <div className="flex justify-between pt-1 text-base font-bold"><span>Total paid</span><span>{money(order.totalCents)}</span></div>
            </div>
            <div className="mt-3 break-all text-xs text-ionos-muted">Payment ID: {order.paymentId}</div>
          </Card>

          <Card className="print:hidden">
            <h2 className="mb-2 font-sans text-lg font-bold normal-case tracking-normal">Private notes</h2>
            <textarea className={field} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Only you can see these." />
            <button className={`${btnOutline} mt-2`} disabled={busy === 'notes' || notes === order.notes} onClick={saveNotes}>Save notes</button>
          </Card>
        </div>

        <div className="space-y-5 print:hidden">
          <Card>
            <h2 className="mb-3 font-sans text-lg font-bold normal-case tracking-normal">Fulfillment status</h2>
            <select className={field} value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
            </select>
            <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Email the customer about this change</label>
            <button className={`${btnPrimary} mt-3 w-full`} disabled={busy === 'status' || status === order.status} onClick={saveStatus}>
              {busy === 'status' ? 'Saving…' : 'Update status'}
            </button>
          </Card>

          <Card>
            <h2 className="mb-3 font-sans text-lg font-bold normal-case tracking-normal">Shipping label</h2>
            {order.fulfillment === 'LOCAL_PICKUP' ? (
              <p className="text-sm text-ionos-muted">This is a local pickup order, so no label is needed. Set the status to "Ready for pickup" when it's ready.</p>
            ) : order.labelUrl ? (
              <div className="space-y-3 text-sm">
                <div className="rounded bg-green-50 p-3">
                  <div className="font-bold">{order.carrier} {order.service}</div>
                  <div>Tracking: {order.trackingUrl ? <a className="font-semibold text-ionos-primary underline" href={order.trackingUrl} target="_blank" rel="noreferrer">{order.trackingNumber}</a> : order.trackingNumber}</div>
                  {order.labelCostCents != null && <div className="text-ionos-muted">Label cost {money(order.labelCostCents)}</div>}
                </div>
                <a className={`${btnPrimary} w-full`} href={order.labelUrl} target="_blank" rel="noreferrer">Print label again (4×6)</a>
              </div>
            ) : !labelsReady ? (
              <div className="rounded bg-amber-50 p-3 text-sm text-ionos-text">
                <b>Connect Shippo to enable labels.</b> Once your Shippo key and ship-from address are added, this card buys and prints a label in one click.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={label}>Weight (lb)</label><input className={field} type="number" min="0" step="1" value={lb} onChange={(e) => setLb(e.target.value)} /></div>
                  <div><label className={label}>Weight (oz)</label><input className={field} type="number" min="0" step="0.1" value={oz} onChange={(e) => setOz(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={label}>Length (in)</label><input className={field} type="number" min="0" step="0.1" value={dims.l} onChange={pk('l')} /></div>
                  <div><label className={label}>Width (in)</label><input className={field} type="number" min="0" step="0.1" value={dims.w} onChange={pk('w')} /></div>
                  <div><label className={label}>Height (in)</label><input className={field} type="number" min="0" step="0.1" value={dims.h} onChange={pk('h')} /></div>
                </div>
                <p className="text-xs text-ionos-muted">Pre-filled from the items in this order. Change anything that doesn't match your box.</p>

                <button className={`${btnPrimary} w-full`} disabled={!!busy} onClick={() => buyLabel(false)}>
                  {busy === 'label' ? 'Buying label…' : 'Buy cheapest label & print'}
                </button>
                <button className={`${btnOutline} w-full`} disabled={!!busy} onClick={seeRates}>{busy === 'rates' ? 'Getting rates…' : 'Compare rates first'}</button>

                {rates.length > 0 && (
                  <div className="space-y-2">
                    {rates.map((r) => (
                      <label key={r.id} className={`flex cursor-pointer items-center gap-3 rounded border p-3 text-sm ${rateId === r.id ? 'border-ionos-primary bg-blue-50' : 'border-ionos-line'}`}>
                        <input type="radio" name="rate" checked={rateId === r.id} onChange={() => setRateId(r.id)} />
                        <span className="flex-1"><b>{r.provider}</b> {r.service}<br /><span className="text-ionos-muted">{r.estimatedDays ? `about ${r.estimatedDays} day(s)` : 'delivery estimate unavailable'}</span></span>
                        <b>{money(r.amountCents)}</b>
                      </label>
                    ))}
                    <button className={`${btnPrimary} w-full`} disabled={!rateId || !!busy} onClick={() => buyLabel(true)}>Buy selected label & print</button>
                  </div>
                )}
                <p className="text-xs text-ionos-muted">Postage is charged to your Shippo account when you buy.</p>
                {labelErr && <p className="rounded bg-red-50 p-2 text-sm text-ionos-red">{labelErr}</p>}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

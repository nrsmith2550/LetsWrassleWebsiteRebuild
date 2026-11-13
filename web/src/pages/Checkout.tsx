import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { useEffect, useMemo, useState } from 'react';
import { CreditCard, PaymentForm } from 'react-square-web-payments-sdk';
import { Link, useNavigate } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import { api, AppConfig, money } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useCart } from '../lib/cart';

type Fulfillment = 'SHIPPING' | 'LOCAL_PICKUP';
type Gateway = 'STRIPE' | 'SQUARE';
interface Quote { subtotalCents: number; shippingCents: number; taxCents: number; totalCents: number }

const stripeCache: Record<string, Promise<Stripe | null>> = {};
const getStripe = (key: string) => (stripeCache[key] ||= loadStripe(key));

const phoneOk = (v: string) => /^[+()\-.\s\d]{7,25}$/.test(v) && v.replace(/\D/g, '').length >= 10;

/** Rendered inside <Elements>. Confirms the payment on-page (never redirects off-site). */
function StripePayForm({ paymentIntentId, totalCents, onPaid, onError }: { paymentIntentId: string; totalCents: number; onPaid(order: any): void; onError(m: string): void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  async function pay() {
    if (!stripe || !elements) return;
    setBusy(true);
    onError('');
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/checkout` },
      redirect: 'if_required',
    });
    if (error) {
      onError(error.message || 'Payment failed.');
      setBusy(false);
      return;
    }
    try {
      const r = await api<{ order: any }>('/checkout/stripe/finalize', { body: { paymentIntentId } });
      onPaid(r.order);
    } catch (e: any) {
      onError(e.message);
      setBusy(false);
    }
  }

  return (
    <div>
      <PaymentElement />
      <button className="btn-orange mt-5 w-full" disabled={!stripe || busy} onClick={pay}>
        {busy ? 'Processing…' : `Pay ${money(totalCents)}`}
      </button>
    </div>
  );
}

export default function Checkout() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { lines, clear, subtotalCents } = useCart();
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const [gateway, setGateway] = useState<Gateway | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fulfillment, setFulfillment] = useState<Fulfillment>('SHIPPING');
  const [addr, setAddr] = useState({ line1: '', line2: '', city: '', state: 'PA', postalCode: '', country: 'US' });

  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [intent, setIntent] = useState<{ clientSecret: string; paymentIntentId: string } | null>(null);

  useEffect(() => {
    if (user) {
      setName((n) => n || user.name);
      setEmail((e) => e || user.email);
      setPhone((p) => p || user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    api<AppConfig>('/config').then((c) => { setCfg(c); setGateway(c.primaryGateway); }).catch((e) => setError(e.message));
  }, []);

  const items = useMemo(() => lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })), [lines]);

  useEffect(() => {
    if (!items.length) return;
    api<Quote>('/checkout/quote', { body: { items, fulfillmentMethod: fulfillment } })
      .then((q) => { setQuote(q); setError(''); })
      .catch((e) => setError(e.message));
  }, [items, fulfillment]);

  // Any change to details invalidates an already-created Stripe intent.
  const locked = !!intent;

  function validate(): string {
    if (name.trim().length < 2) return 'Please enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Please enter a valid email address.';
    if (!phoneOk(phone.trim())) return 'Please enter a valid phone number.';
    if (fulfillment === 'SHIPPING') {
      if (addr.line1.trim().length < 3 || addr.city.trim().length < 2 || addr.state.trim().length < 2 || addr.postalCode.trim().length < 3)
        return 'Please complete your shipping address.';
    }
    return '';
  }

  const payload = () => ({
    items,
    customer: { name: name.trim(), email: email.trim(), phone: phone.trim() },
    fulfillmentMethod: fulfillment,
    shippingAddress: fulfillment === 'SHIPPING' ? addr : undefined,
  });

  function done(order: any) {
    clear();
    nav('/order-confirmation', { state: { order }, replace: true });
  }

  async function startStripe() {
    const v = validate();
    if (v) return setError(v);
    setBusy(true);
    setError('');
    try {
      const r = await api<{ clientSecret: string; paymentIntentId: string }>('/checkout/stripe/create-intent', { body: payload() });
      setIntent(r);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function paySquare(sourceId: string) {
    setBusy(true);
    setError('');
    try {
      const r = await api<{ order: any }>('/checkout/square/pay', { body: { ...payload(), sourceId } });
      done(r.order);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  if (!lines.length) {
    return <div className="p-20 text-center"><h1 className="text-3xl">Your cart is empty</h1><Link to="/shop" className="btn-primary mt-6">Shop now</Link></div>;
  }

  const total = quote?.totalCents ?? subtotalCents;
  const set = (k: string) => (e: any) => setAddr({ ...addr, [k]: e.target.value });

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[1fr_380px]">
      <div className="space-y-8">
        <h1 className="text-3xl">Checkout</h1>

        <section className="card">
          <h2 className="mb-4 text-lg">1. Your information</h2>
          <fieldset disabled={locked} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="label">Full name *</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required /></div>
            <div><label className="label">Email *</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></div>
            <div><label className="label">Phone *</label><input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="(555) 555-5555" required /></div>
          </fieldset>
          {!user && <p className="mt-3 text-xs text-gray-500">Checking out as guest. <Link to="/login" state={{ from: '/checkout' }} className="font-bold text-orange">Log in</Link> or <Link to="/register" className="font-bold text-orange">create an account</Link> to track orders.</p>}
        </section>

        <section className="card">
          <h2 className="mb-4 text-lg">2. Delivery</h2>
          <fieldset disabled={locked} className="space-y-3">
            <label className={`flex cursor-pointer items-start gap-3 rounded border-2 p-3 ${fulfillment === 'SHIPPING' ? 'border-ink' : 'border-gray-200'}`}>
              <input type="radio" checked={fulfillment === 'SHIPPING'} onChange={() => setFulfillment('SHIPPING')} className="mt-1" />
              <span><b>Standard Shipping</b><br /><span className="text-sm text-gray-600">{money(cfg?.store.shippingFlatCents ?? 0)} flat rate · ships in 2–3 business days</span></span>
            </label>
            <label className={`flex cursor-pointer items-start gap-3 rounded border-2 p-3 ${fulfillment === 'LOCAL_PICKUP' ? 'border-ink' : 'border-gray-200'}`}>
              <input type="radio" checked={fulfillment === 'LOCAL_PICKUP'} onChange={() => setFulfillment('LOCAL_PICKUP')} className="mt-1" />
              <span><b>Local Pickup</b> <span className="text-sm text-gray-600">· free</span></span>
            </label>
            {fulfillment === 'LOCAL_PICKUP' && (
              <p className="rounded bg-orange/10 p-3 text-sm font-semibold text-orange-dark">Please only select Local Pickup if coordinated beforehand.</p>
            )}
            {fulfillment === 'SHIPPING' && (
              <div className="grid gap-4 pt-2 sm:grid-cols-2">
                <div className="sm:col-span-2"><label className="label">Address *</label><input className="input" value={addr.line1} onChange={set('line1')} autoComplete="address-line1" /></div>
                <div className="sm:col-span-2"><label className="label">Apt, suite, etc.</label><input className="input" value={addr.line2} onChange={set('line2')} autoComplete="address-line2" /></div>
                <div><label className="label">City *</label><input className="input" value={addr.city} onChange={set('city')} autoComplete="address-level2" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">State *</label><input className="input" value={addr.state} onChange={set('state')} autoComplete="address-level1" maxLength={30} /></div>
                  <div><label className="label">ZIP *</label><input className="input" value={addr.postalCode} onChange={set('postalCode')} autoComplete="postal-code" /></div>
                </div>
              </div>
            )}
          </fieldset>
        </section>

        <section className="card">
          <h2 className="mb-4 text-lg">3. Payment</h2>
          {!cfg ? <p className="text-gray-500">Loading…</p> : cfg.gateways.length === 0 ? (
            <p className="text-red-600">Online payments are not configured yet. Please contact support@letswrassleapparel.com.</p>
          ) : (
            <>
              {cfg.gateways.length > 1 && (
                <div className="mb-4 flex gap-2">
                  {cfg.gateways.map((g) => (
                    <button key={g} disabled={locked || busy} onClick={() => setGateway(g)}
                      className={`flex-1 rounded border-2 px-3 py-2.5 text-sm font-bold ${gateway === g ? 'border-ink bg-ink text-white' : 'border-gray-300'}`}>
                      Card / Wallet ({g === 'STRIPE' ? 'Stripe' : 'Square'})
                    </button>
                  ))}
                </div>
              )}

              {gateway === 'STRIPE' && cfg.stripePublishableKey && (
                intent ? (
                  <>
                    <Elements stripe={getStripe(cfg.stripePublishableKey)} options={{ clientSecret: intent.clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#e8731f' } } }}>
                      <StripePayForm paymentIntentId={intent.paymentIntentId} totalCents={total} onPaid={done} onError={setError} />
                    </Elements>
                    <button className="mt-3 text-xs text-gray-500 underline" onClick={() => { setIntent(null); setError(''); }}>← Edit details</button>
                  </>
                ) : (
                  <button className="btn-primary w-full" disabled={busy || !quote} onClick={startStripe}>{busy ? 'Preparing…' : 'Continue to payment'}</button>
                )
              )}

              {gateway === 'SQUARE' && cfg.square && (
                <div className={busy ? 'pointer-events-none opacity-60' : ''}>
                  <PaymentForm
                    applicationId={cfg.square.applicationId}
                    locationId={cfg.square.locationId}
                    cardTokenizeResponseReceived={(token) => {
                      const v = validate();
                      if (v) return setError(v);
                      if (token.status !== 'OK' || !token.token) {
                        return setError((token as any).errors?.[0]?.message || 'Could not read card details.');
                      }
                      void paySquare(token.token);
                    }}
                  >
                    <CreditCard>{`Pay ${money(total)}`}</CreditCard>
                  </PaymentForm>
                </div>
              )}
            </>
          )}
          {error && <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          <p className="mt-4 text-xs text-gray-500">Payments are processed securely without leaving this page. Your card details never touch our servers.</p>
        </section>
      </div>

      {/* Summary */}
      <aside className="h-fit lg:sticky lg:top-24">
        <div className="card">
          <h2 className="mb-4 text-lg">Order summary</h2>
          <ul className="divide-y">
            {lines.map((l) => (
              <li key={l.variantId} className="flex gap-3 py-3 text-sm">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-bone"><ProductImage src={l.image} alt={l.name} /></div>
                <div className="flex-1"><div className="font-semibold">{l.name}</div><div className="text-gray-500">{l.variantLabel} × {l.quantity}</div></div>
                <div className="font-bold">{money(l.unitPriceCents * l.quantity)}</div>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{money(quote?.subtotalCents ?? subtotalCents)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{quote ? (quote.shippingCents ? money(quote.shippingCents) : 'Free') : '—'}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{quote ? money(quote.taxCents) : '—'}</span></div>
            <div className="flex justify-between pt-2 text-lg font-bold"><span>Total</span><span>{money(total)}</span></div>
          </div>
        </div>
      </aside>
    </div>
  );
}

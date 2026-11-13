import { Elements, ExpressCheckoutElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { useEffect, useMemo, useState } from 'react';
import { CreditCard, PaymentForm } from 'react-square-web-payments-sdk';
import { Link, useNavigate } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import { CheckoutRequest, Fulfillment, money, OrderSummary, PayConfig, post } from '../lib/api';
import { useCart } from '../lib/cart';
import { useCatalog } from '../lib/catalog';
import { priceCart } from '../../../shared/pricing';
import { validateCheckout } from '../../../shared/validate';

const stripeCache: Record<string, Promise<Stripe | null>> = {};
const getStripe = (key: string) => (stripeCache[key] ||= loadStripe(key));

/** Apple Pay / Google Pay via Stripe's Express Checkout Element. Payment happens in the wallet sheet on this page. */
function WalletPay({ build, totalCents, onPaid, onError, onAvailable }: { build(): CheckoutRequest; totalCents: number; onPaid(o: OrderSummary): void; onError(m: string): void; onAvailable(a: boolean): void }) {
  const stripe = useStripe();
  const elements = useElements();

  async function confirm() {
    if (!stripe || !elements) return;
    onError('');
    const { error: submitError } = await elements.submit();
    if (submitError) return onError(submitError.message || 'Could not start payment.');
    let intent: { clientSecret: string; order: OrderSummary };
    try {
      intent = await post('/api/stripe-intent', build());
    } catch (e: any) {
      return onError(e.message);
    }
    const { error } = await stripe.confirmPayment({
      elements,
      clientSecret: intent.clientSecret,
      confirmParams: { return_url: `${window.location.origin}/order-confirmation` },
      redirect: 'if_required',
    });
    if (error) return onError(error.message || 'Payment failed.');
    onPaid(intent.order);
  }

  return (
    <div data-total={totalCents}>
      <ExpressCheckoutElement
        options={{
          paymentMethods: { applePay: 'auto', googlePay: 'auto', link: 'never', paypal: 'never', amazonPay: 'never' },
          buttonHeight: 48,
        }}
        onReady={(e) => onAvailable(!!e.availablePaymentMethods?.applePay || !!e.availablePaymentMethods?.googlePay)}
        onClick={(e) => {
          try {
            build(); // validates the customer details before the wallet sheet opens
            onError('');
            e.resolve({});
          } catch (err: any) {
            onError(err.message);
          }
        }}
        onConfirm={confirm}
      />
    </div>
  );
}

export default function Checkout() {
  const nav = useNavigate();
  const { catalog } = useCatalog();
  const { lines, clear } = useCart();
  const [pay, setPay] = useState<PayConfig | null>(null);
  const [walletShown, setWalletShown] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fulfillment, setFulfillment] = useState<Fulfillment>('SHIPPING');
  const [addr, setAddr] = useState({ line1: '', line2: '', city: '', state: 'PA', postalCode: '', country: 'US' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/config').then((r) => r.json()).then(setPay).catch(() => setPay({ stripePublishableKey: null, square: null }));
  }, []);

  const items = useMemo(() => lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })), [lines]);

  // Prices come from catalog.json (the same file the server charges from).
  const { quote, quoteError } = useMemo(() => {
    if (!catalog || !items.length) return { quote: null, quoteError: '' };
    try {
      return { quote: priceCart(catalog, items, fulfillment), quoteError: '' };
    } catch (e: any) {
      return { quote: null, quoteError: e.message as string };
    }
  }, [catalog, items, fulfillment]);

  const build = (): CheckoutRequest =>
    validateCheckout({ items, customer: { name, email, phone }, fulfillment, address: fulfillment === 'SHIPPING' ? addr : undefined });

  function done(order: OrderSummary) {
    clear();
    nav('/order-confirmation', { state: { order }, replace: true });
  }

  async function paySquare(sourceId: string) {
    setBusy(true);
    setError('');
    try {
      const r = await post<{ order: OrderSummary }>('/api/square-pay', { ...build(), sourceId });
      done(r.order);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  if (!lines.length) return <div className="p-20 text-center"><h1 className="text-3xl">Your cart is empty</h1><Link to="/shop" className="btn-primary mt-6">Shop now</Link></div>;

  const total = quote?.totalCents ?? 0;
  const set = (k: string) => (e: any) => setAddr({ ...addr, [k]: e.target.value });
  const noGateways = pay && !pay.square && !pay.stripePublishableKey;

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[1fr_380px]">
      <div className="space-y-8">
        <h1 className="text-3xl">Checkout</h1>

        <section className="card">
          <h2 className="mb-4 text-lg">1. Your information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="label">Full name *</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
            <div><label className="label">Email *</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
            <div><label className="label">Phone *</label><input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="(555) 555-5555" /></div>
          </div>
        </section>

        <section className="card">
          <h2 className="mb-4 text-lg">2. Delivery</h2>
          <div className="space-y-3">
            <label className={`flex cursor-pointer items-start gap-3 rounded border-2 p-3 ${fulfillment === 'SHIPPING' ? 'border-ink' : 'border-gray-200'}`}>
              <input type="radio" checked={fulfillment === 'SHIPPING'} onChange={() => setFulfillment('SHIPPING')} className="mt-1" />
              <span><b>Standard Shipping</b><br /><span className="text-sm text-gray-600">{money(catalog?.settings.shippingFlatCents ?? 0)} flat rate · ships in 2–3 business days</span></span>
            </label>
            <label className={`flex cursor-pointer items-start gap-3 rounded border-2 p-3 ${fulfillment === 'LOCAL_PICKUP' ? 'border-ink' : 'border-gray-200'}`}>
              <input type="radio" checked={fulfillment === 'LOCAL_PICKUP'} onChange={() => setFulfillment('LOCAL_PICKUP')} className="mt-1" />
              <span><b>Local Pickup</b> <span className="text-sm text-gray-600">· free</span></span>
            </label>
            {fulfillment === 'LOCAL_PICKUP' && <p className="rounded bg-orange/10 p-3 text-sm font-semibold text-orange-dark">{catalog?.settings.pickupNotice}</p>}
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
          </div>
        </section>

        <section className="card">
          <h2 className="mb-4 text-lg">3. Payment</h2>
          {!pay || !catalog ? <p className="text-gray-500">Loading…</p> : noGateways ? (
            <p className="text-red-600">Online payments are not configured yet. Please contact support@letswrassleapparel.com.</p>
          ) : quoteError ? (
            <p className="rounded bg-red-50 p-3 text-sm text-red-700">{quoteError}</p>
          ) : (
            <div className="space-y-5">
              {pay.stripePublishableKey && quote && (
                <div className={walletShown ? '' : 'hidden'}>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Apple Pay / Google Pay</div>
                  <Elements stripe={getStripe(pay.stripePublishableKey)} options={{ mode: 'payment', amount: total, currency: 'usd', appearance: { theme: 'stripe' } }}>
                    <WalletPay build={build} totalCents={total} onPaid={done} onError={setError} onAvailable={setWalletShown} />
                  </Elements>
                </div>
              )}

              {pay.square && (
                <div>
                  {pay.stripePublishableKey && walletShown && <div className="mb-3 flex items-center gap-3 text-xs uppercase tracking-wider text-gray-400"><span className="h-px flex-1 bg-gray-200" />or pay with card<span className="h-px flex-1 bg-gray-200" /></div>}
                  <div className={busy ? 'pointer-events-none opacity-60' : ''}>
                    <PaymentForm
                      applicationId={pay.square.applicationId}
                      locationId={pay.square.locationId}
                      cardTokenizeResponseReceived={(token) => {
                        try {
                          build();
                        } catch (e: any) {
                          return setError(e.message);
                        }
                        if (token.status !== 'OK' || !token.token) return setError((token as any).errors?.[0]?.message || 'Could not read card details.');
                        void paySquare(token.token);
                      }}
                    >
                      <CreditCard>{`Pay ${money(total)}`}</CreditCard>
                    </PaymentForm>
                  </div>
                </div>
              )}
            </div>
          )}
          {error && <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          <p className="mt-4 text-xs text-gray-500">Payments are processed securely without leaving this page. Your card details never touch our servers.</p>
        </section>
      </div>

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
            <div className="flex justify-between"><span>Subtotal</span><span>{quote ? money(quote.subtotalCents) : '—'}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{quote ? (quote.shippingCents ? money(quote.shippingCents) : 'Free') : '—'}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{quote ? money(quote.taxCents) : '—'}</span></div>
            <div className="flex justify-between pt-2 text-lg font-bold"><span>Total</span><span>{quote ? money(total) : '—'}</span></div>
          </div>
        </div>
      </aside>
    </div>
  );
}

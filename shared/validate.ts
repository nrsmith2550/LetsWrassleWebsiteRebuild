import type { Address, CheckoutRequest } from './types';

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const phoneOk = (v: string) => /^[+()\-.\s\d]{7,25}$/.test(v) && v.replace(/\D/g, '').length >= 10;
export const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export function validateAddress(a: any): { ok: true; value: Address } | { ok: false; error: string } {
  const value: Address = {
    line1: str(a?.line1),
    line2: str(a?.line2),
    city: str(a?.city),
    state: str(a?.state, 30),
    postalCode: str(a?.postalCode, 12),
    country: str(a?.country, 2).toUpperCase() || 'US',
  };
  if (value.line1.length < 3 || value.city.length < 2 || value.state.length < 2 || value.postalCode.length < 3) {
    return { ok: false, error: 'Please complete your shipping address.' };
  }
  return { ok: true, value };
}

/** Throws Error(message) for the first problem found. */
export function validateCheckout(body: any): CheckoutRequest {
  const name = str(body?.customer?.name, 100);
  const email = str(body?.customer?.email, 150).toLowerCase();
  const phone = str(body?.customer?.phone, 25);
  if (name.length < 2) throw new Error('Please enter your full name.');
  if (!emailOk(email)) throw new Error('Please enter a valid email address.');
  if (!phoneOk(phone)) throw new Error('Please enter a valid phone number.');

  const fulfillment = body?.fulfillment === 'LOCAL_PICKUP' ? 'LOCAL_PICKUP' : 'SHIPPING';
  let address: Address | undefined;
  if (fulfillment === 'SHIPPING') {
    const r = validateAddress(body?.address);
    if (!r.ok) throw new Error(r.error);
    address = r.value;
  }

  if (!Array.isArray(body?.items)) throw new Error('Your cart is empty.');
  const items = body.items.map((i: any) => ({ variantId: str(i?.variantId, 120), quantity: Number(i?.quantity) }));
  return { items, customer: { name, email, phone }, fulfillment, address };
}

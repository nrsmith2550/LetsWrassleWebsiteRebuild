import type { Env } from './server';
import type { Address } from './types';

/** Shippo REST: live USPS/UPS rates, then buy a 4x6 PDF label. https://docs.goshippo.com */
const API = 'https://api.goshippo.com';

export interface Parcel {
  weightOz: number;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
}

export interface Rate {
  id: string;
  provider: string;
  service: string;
  amountCents: number;
  estimatedDays: number | null;
}

export class ShippoError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

export const shippoConfigured = (env: Env) =>
  !!(env.SHIPPO_API_KEY && env.SHIP_FROM_STREET1 && env.SHIP_FROM_CITY && env.SHIP_FROM_ZIP);

async function shippo(env: Env, path: string, body?: unknown) {
  if (!env.SHIPPO_API_KEY) throw new ShippoError('Shipping labels are not set up yet: add SHIPPO_API_KEY.', 503);
  const res = await fetch(`${API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `ShippoToken ${env.SHIPPO_API_KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new ShippoError(`Shippo error: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

function fromAddress(env: Env) {
  if (!env.SHIP_FROM_STREET1 || !env.SHIP_FROM_CITY || !env.SHIP_FROM_ZIP) {
    throw new ShippoError('Add your ship-from address (SHIP_FROM_STREET1, SHIP_FROM_CITY, SHIP_FROM_STATE, SHIP_FROM_ZIP).', 503);
  }
  return {
    name: env.SHIP_FROM_NAME || "Let's Wrassle Apparel",
    street1: env.SHIP_FROM_STREET1,
    city: env.SHIP_FROM_CITY,
    state: env.SHIP_FROM_STATE || 'PA',
    zip: env.SHIP_FROM_ZIP,
    country: 'US',
    phone: env.SHIP_FROM_PHONE || '',
    email: env.SHIP_FROM_EMAIL || '',
  };
}

export async function getRates(env: Env, to: Address & { name: string; phone?: string; email?: string }, parcel: Parcel): Promise<Rate[]> {
  const shipment = await shippo(env, '/shipments/', {
    address_from: fromAddress(env),
    address_to: {
      name: to.name,
      street1: to.line1,
      street2: to.line2 || '',
      city: to.city,
      state: to.state,
      zip: to.postalCode,
      country: to.country || 'US',
      phone: to.phone || '',
      email: to.email || '',
    },
    parcels: [
      {
        length: String(parcel.lengthIn),
        width: String(parcel.widthIn),
        height: String(parcel.heightIn),
        distance_unit: 'in',
        weight: String(parcel.weightOz),
        mass_unit: 'oz',
      },
    ],
    async: false,
  });
  const rates: Rate[] = (shipment.rates || [])
    .filter((r: any) => ['USPS', 'UPS'].includes(String(r.provider).toUpperCase()))
    .map((r: any) => ({
      id: r.object_id,
      provider: r.provider,
      service: r.servicelevel?.name || r.servicelevel?.token || '',
      amountCents: Math.round(parseFloat(r.amount) * 100),
      estimatedDays: r.estimated_days ?? null,
    }))
    .sort((a: Rate, b: Rate) => a.amountCents - b.amountCents);
  if (!rates.length) {
    const msgs = (shipment.messages || []).map((m: any) => m.text).filter(Boolean).join(' ');
    throw new ShippoError(`No USPS/UPS rates came back for this address. ${msgs}`.trim(), 422);
  }
  return rates;
}

export async function purchaseLabel(env: Env, rateId: string) {
  const rate = await shippo(env, `/rates/${encodeURIComponent(rateId)}`);
  const tx = await shippo(env, '/transactions/', { rate: rateId, label_file_type: 'PDF_4x6', async: false });
  if (tx.status !== 'SUCCESS') {
    const msgs = (tx.messages || []).map((m: any) => m.text).filter(Boolean).join(' ');
    throw new ShippoError(`Label purchase failed (${tx.status}). ${msgs}`.trim());
  }
  return {
    carrier: String(rate.provider),
    service: String(rate.servicelevel?.name || ''),
    trackingNumber: String(tx.tracking_number),
    trackingUrl: String(tx.tracking_url_provider || ''),
    labelUrl: String(tx.label_url),
    amountCents: Math.round(parseFloat(rate.amount) * 100),
  };
}

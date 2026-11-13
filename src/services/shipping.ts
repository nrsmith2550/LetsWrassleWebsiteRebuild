import { config } from '../config';
import { HttpError } from '../utils';

/**
 * Shippo REST integration: live USPS/UPS rates from package dimensions + weight,
 * label purchase (4x6 PDF). https://docs.goshippo.com
 */
const API = 'https://api.goshippo.com';

export interface Address {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  phone?: string;
  email?: string;
}

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
  durationTerms: string;
}

async function shippo(path: string, init: { method?: string; body?: any } = {}) {
  if (!config.shippo.apiKey) throw new HttpError(503, 'Shippo is not configured (set SHIPPO_API_KEY).');
  const res = await fetch(`${API}${path}`, {
    method: init.method || 'GET',
    headers: { Authorization: `ShippoToken ${config.shippo.apiKey}`, 'Content-Type': 'application/json' },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof data === 'object' ? JSON.stringify(data).slice(0, 300) : String(data);
    throw new HttpError(502, `Shippo error: ${msg}`);
  }
  return data;
}

function toShippoAddress(a: Address) {
  return {
    name: a.name,
    street1: a.line1,
    street2: a.line2 || '',
    city: a.city,
    state: a.state,
    zip: a.postalCode,
    country: a.country || 'US',
    phone: a.phone || '',
    email: a.email || '',
  };
}

function fromAddress() {
  const f = config.shippo.from;
  if (!f.street1 || !f.city || !f.zip) {
    throw new HttpError(503, 'Set the SHIP_FROM_* address variables to buy labels.');
  }
  return {
    name: f.name,
    street1: f.street1,
    city: f.city,
    state: f.state,
    zip: f.zip,
    country: f.country,
    phone: f.phone,
    email: f.email,
  };
}

export async function getRates(to: Address, parcel: Parcel): Promise<Rate[]> {
  const shipment = await shippo('/shipments/', {
    method: 'POST',
    body: {
      address_from: fromAddress(),
      address_to: toShippoAddress(to),
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
    },
  });
  const rates: Rate[] = (shipment.rates || [])
    .filter((r: any) => ['USPS', 'UPS'].includes(String(r.provider).toUpperCase()))
    .map((r: any) => ({
      id: r.object_id,
      provider: r.provider,
      service: r.servicelevel?.name || r.servicelevel?.token || '',
      amountCents: Math.round(parseFloat(r.amount) * 100),
      estimatedDays: r.estimated_days ?? null,
      durationTerms: r.duration_terms || '',
    }))
    .sort((a: Rate, b: Rate) => a.amountCents - b.amountCents);
  if (!rates.length) {
    const msgs = (shipment.messages || []).map((m: any) => m.text).filter(Boolean).join(' ');
    throw new HttpError(422, `No USPS/UPS rates returned. ${msgs}`.trim());
  }
  return rates;
}

export async function purchaseLabel(rateId: string) {
  const rate = await shippo(`/rates/${encodeURIComponent(rateId)}`);
  const tx = await shippo('/transactions/', {
    method: 'POST',
    body: { rate: rateId, label_file_type: 'PDF_4x6', async: false },
  });
  if (tx.status !== 'SUCCESS') {
    const msgs = (tx.messages || []).map((m: any) => m.text).filter(Boolean).join(' ');
    throw new HttpError(502, `Label purchase failed (${tx.status}). ${msgs}`.trim());
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

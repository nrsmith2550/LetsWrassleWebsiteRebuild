export type * from '../../../shared/types';

export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export async function post<T = any>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

export interface PayConfig {
  stripePublishableKey: string | null;
  square: { applicationId: string; locationId: string; environment: 'sandbox' | 'production' } | null;
}

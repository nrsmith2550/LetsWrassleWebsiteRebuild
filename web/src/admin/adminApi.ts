import type { StoredOrder } from '../../../shared/db';

export type { StoredOrder };

export class AuthError extends Error {}

export async function adminApi<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new AuthError(data?.error || 'Please sign in.');
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

export const money = (cents: number | null | undefined) => `$${((cents ?? 0) / 100).toFixed(2)}`;

export const STATUS: Record<string, { label: string; tone: string }> = {
  AWAITING: { label: 'Awaiting processing', tone: 'text-ionos-amber' },
  PROCESSING: { label: 'Processing', tone: 'text-ionos-primary' },
  SHIPPED: { label: 'Shipped', tone: 'text-ionos-green' },
  READY_FOR_PICKUP: { label: 'Ready for pickup', tone: 'text-ionos-primary' },
  DELIVERED: { label: 'Delivered', tone: 'text-ionos-green' },
  CANCELLED: { label: 'Cancelled', tone: 'text-ionos-red' },
};
export const STATUS_ORDER = ['AWAITING', 'PROCESSING', 'SHIPPED', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED'];

export function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export const shortNumber = (n: string) => n.replace(/^LW-/, '');

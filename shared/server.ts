import type { Catalog } from './types';
import type { EmailEnv } from './email';

/** Minimal D1 typings (Cloudflare's SQLite database). */
export interface D1Stmt {
  bind(...values: unknown[]): D1Stmt;
  run(): Promise<{ meta: { changes: number; last_row_id: number } }>;
  all<T = any>(): Promise<{ results: T[] }>;
  first<T = any>(): Promise<T | null>;
}
export interface D1 {
  prepare(sql: string): D1Stmt;
}

/** Environment variables / secrets configured in Cloudflare Pages (or .dev.vars locally). */
export interface Env extends EmailEnv {
  ASSETS: { fetch(req: Request | string | URL): Promise<Response> };
  DB?: D1;
  SQUARE_ACCESS_TOKEN?: string;
  SQUARE_APPLICATION_ID?: string;
  SQUARE_LOCATION_ID?: string;
  SQUARE_ENVIRONMENT?: string; // sandbox | production
  STRIPE_SECRET_KEY?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  GITHUB_OAUTH_CLIENT_ID?: string;
  GITHUB_OAUTH_CLIENT_SECRET?: string;
  // Admin hub
  ADMIN_GITHUB_USERS?: string; // comma-separated GitHub usernames allowed into /admin
  SESSION_SECRET?: string; // random string used to sign admin session cookies
  DEV_ADMIN_BYPASS?: string; // "1" skips login, ONLY honored on localhost
  // Shipping labels (Shippo)
  SHIPPO_API_KEY?: string;
  SHIP_FROM_NAME?: string;
  SHIP_FROM_COMPANY?: string;
  SHIPPO_CARRIERS?: string; // e.g. "USPS" (default) or "USPS,UPS"
  SHIP_FROM_STREET1?: string;
  SHIP_FROM_CITY?: string;
  SHIP_FROM_STATE?: string;
  SHIP_FROM_ZIP?: string;
  SHIP_FROM_PHONE?: string;
  SHIP_FROM_EMAIL?: string;
}

export interface Ctx {
  request: Request;
  env: Env;
  params: Record<string, string>;
  waitUntil(p: Promise<unknown>): void;
}

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

let cache: { at: number; data: Catalog } | null = null;

/** Loads the compiled catalog.json that ships with the site (the single source of prices). */
export async function loadCatalog(ctx: Pick<Ctx, 'env' | 'request'>): Promise<Catalog> {
  if (cache && Date.now() - cache.at < 30_000) return cache.data;
  const res = await ctx.env.ASSETS.fetch(new URL('/catalog.json', ctx.request.url));
  if (!res.ok) throw new Error('Catalog unavailable');
  const data = (await res.json()) as Catalog;
  cache = { at: Date.now(), data };
  return data;
}

/** Human-friendly order number, e.g. LW-251113-K3F9 (no database needed). */
export function newOrderNumber() {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
  return `LW-${ymd}-${rand}`;
}

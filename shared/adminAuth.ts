import type { Ctx, Env } from './server';
import { json } from './server';

const COOKIE = 'lw_admin';
const SESSION_HOURS = 12;
const enc = new TextEncoder();

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const b64 = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s: string) => atob(s.replace(/-/g, '+').replace(/_/g, '/'));

async function sign(secret: string, data: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const allowedAdmins = (env: Env) =>
  (env.ADMIN_GITHUB_USERS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

/** Builds the Set-Cookie header for a signed admin session. */
export async function sessionCookie(env: Env, login: string) {
  if (!env.SESSION_SECRET) throw new Error('SESSION_SECRET is not set');
  const payload = b64(JSON.stringify({ u: login, exp: Date.now() + SESSION_HOURS * 3600_000 }));
  const sig = await sign(env.SESSION_SECRET, payload);
  return `${COOKIE}=${payload}.${sig}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_HOURS * 3600}`;
}

export const clearSessionCookie = () => `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;

/** Returns the signed-in admin's GitHub login, or null. */
export async function currentAdmin(env: Env, request: Request): Promise<string | null> {
  const url = new URL(request.url);
  if (env.DEV_ADMIN_BYPASS === '1' && url.hostname === 'localhost') return 'local-dev';

  if (!env.SESSION_SECRET) return null;
  const raw = /(?:^|;\s*)lw_admin=([^;]+)/.exec(request.headers.get('Cookie') || '')?.[1];
  if (!raw) return null;
  const [payload, sig] = raw.split('.');
  if (!payload || !sig) return null;
  if (!timingSafeEqual(sig, await sign(env.SESSION_SECRET, payload))) return null;
  try {
    const { u, exp } = JSON.parse(unb64(payload));
    if (typeof u !== 'string' || typeof exp !== 'number' || exp < Date.now()) return null;
    // Re-check the allowlist on every request so removing someone takes effect immediately.
    return allowedAdmins(env).includes(u) ? u : null;
  } catch {
    return null;
  }
}

/** Use at the top of every /api/admin/* handler: `const denied = await guard(ctx); if (denied) return denied;` */
export async function guard(ctx: Pick<Ctx, 'env' | 'request'>): Promise<Response | null> {
  const admin = await currentAdmin(ctx.env, ctx.request);
  if (admin) return null;
  return json({ error: 'Please sign in.' }, 401);
}

import { clearSessionCookie } from '../../../shared/adminAuth';
import { json } from '../../../shared/server';

export const onRequestPost = async () => json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });

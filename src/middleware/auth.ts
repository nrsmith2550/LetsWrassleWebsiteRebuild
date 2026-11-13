import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../db';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const COOKIE = 'lw_token';

export function setAuthCookie(res: Response, user: { id: number; role: string }) {
  const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: config.cookieSecure || config.cookieSameSite === 'none',
    sameSite: config.cookieSameSite,
    maxAge: 7 * 24 * 3600 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE, {
    httpOnly: true,
    secure: config.cookieSecure || config.cookieSameSite === 'none',
    sameSite: config.cookieSameSite,
    path: '/',
  });
}

/** Reads the cookie (if any) and loads the user. Never rejects the request. */
export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[COOKIE];
    if (token) {
      const payload = jwt.verify(token, config.jwtSecret) as any;
      const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } });
      if (user) req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    }
  } catch {
    /* invalid/expired token → treated as logged out */
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Please log in.' });
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Please log in.' });
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required.' });
  next();
}

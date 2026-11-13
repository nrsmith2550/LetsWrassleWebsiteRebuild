import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../db';
import { clearAuthCookie, requireAuth, setAuthCookie } from '../middleware/auth';
import { linkGuestOrders, phoneSchema } from '../services/orders';
import { asyncHandler, HttpError } from '../utils';

const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });

const publicUser = (u: any) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role });

router.post(
  '/register',
  limiter,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().trim().min(2, 'Name is required'),
        email: z.string().trim().toLowerCase().email('Enter a valid email'),
        phone: phoneSchema.optional().or(z.literal('')),
        password: z.string().min(8, 'Password must be at least 8 characters').max(100),
      })
      .parse(req.body);
    if (await prisma.user.findUnique({ where: { email: body.email } })) {
      throw new HttpError(409, 'An account with that email already exists. Try logging in.');
    }
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        passwordHash: await bcrypt.hash(body.password, 12),
        role: 'CUSTOMER',
      },
    });
    await linkGuestOrders(user.id, user.email);
    setAuthCookie(res, user);
    res.status(201).json({ user: publicUser(user) });
  }),
);

router.post(
  '/login',
  limiter,
  asyncHandler(async (req, res) => {
    const body = z
      .object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) })
      .parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      throw new HttpError(401, 'Incorrect email or password.');
    }
    await linkGuestOrders(user.id, user.email);
    setAuthCookie(res, user);
    res.json({ user: publicUser(user) });
  }),
);

router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  res.json({ user: req.user ?? null });
});

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z
      .object({ name: z.string().trim().min(2).optional(), phone: phoneSchema.optional().or(z.literal('')) })
      .parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { ...(body.name ? { name: body.name } : {}), ...(body.phone !== undefined ? { phone: body.phone || null } : {}) },
    });
    res.json({ user: publicUser(user) });
  }),
);

export default router;

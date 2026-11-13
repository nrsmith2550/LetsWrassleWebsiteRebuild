import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler =>
  (req, res, next) =>
    fn(req, res, next).catch(next);

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const where = first?.path?.length ? `${first.path.join('.')}: ` : '';
    return res.status(400).json({ error: `${where}${first?.message || 'Invalid input'}` });
  }
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err?.code === 'P2002') return res.status(409).json({ error: 'That value is already in use (must be unique).' });
  if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large (max 8MB).' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
}

/** Shape a product row for the API (parses images, computes price range). */
export function serializeProduct(p: any) {
  const variants = (p.variants || []).map((v: any) => ({
    id: v.id,
    sku: v.sku,
    size: v.size,
    color: v.color,
    priceOverrideCents: v.priceOverrideCents,
    priceCents: v.priceOverrideCents ?? p.basePriceCents,
    stockQuantity: v.stockQuantity,
  }));
  const prices = variants.map((v: any) => v.priceCents);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    basePriceCents: p.basePriceCents,
    minPriceCents: prices.length ? Math.min(...prices) : p.basePriceCents,
    categoryId: p.categoryId,
    category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : undefined,
    images: parseJson<string[]>(p.imagesJson, []),
    isFeatured: p.isFeatured,
    isActive: p.isActive,
    defaultWeightOz: p.defaultWeightOz,
    defaultLengthIn: p.defaultLengthIn,
    defaultWidthIn: p.defaultWidthIn,
    defaultHeightIn: p.defaultHeightIn,
    totalStock: variants.reduce((n: number, v: any) => n + v.stockQuantity, 0),
    createdAt: p.createdAt,
    variants,
  };
}

export function serializeOrder(o: any) {
  return {
    ...o,
    shippingAddress: parseJson<any>(o.shippingAddressJson, null),
    shippingAddressJson: undefined,
  };
}

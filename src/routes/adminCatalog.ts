import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../db';
import { ALLOWED_IMAGE_TYPES, saveImage } from '../services/storage';
import { asyncHandler, HttpError, serializeProduct, slugify } from '../utils';

const router = Router();

/* ───────── Uploads ───────── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ALLOWED_IMAGE_TYPES.includes(file.mimetype)),
});

router.post(
  '/upload',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Upload a JPG, PNG, WebP or GIF image (max 8MB).');
    const url = await saveImage(req.file);
    res.status(201).json({ url });
  }),
);

/* ───────── Categories ───────── */
const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name required'),
  slug: z.string().trim().optional(),
  description: z.string().trim().default(''),
  isActive: z.boolean().default(true),
});

router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    res.json({ categories });
  }),
);

router.post(
  '/categories',
  asyncHandler(async (req, res) => {
    const b = categorySchema.parse(req.body);
    const max = await prisma.category.aggregate({ _max: { sortOrder: true } });
    const category = await prisma.category.create({
      data: { ...b, slug: slugify(b.slug || b.name), sortOrder: (max._max.sortOrder ?? 0) + 1 },
    });
    res.status(201).json({ category });
  }),
);

// NOTE: declared before '/categories/:id' so "reorder" isn't treated as an id.
router.put(
  '/categories/reorder',
  asyncHandler(async (req, res) => {
    const { ids } = z.object({ ids: z.array(z.number().int()) }).parse(req.body);
    await prisma.$transaction(ids.map((id, i) => prisma.category.update({ where: { id }, data: { sortOrder: i } })));
    res.json({ ok: true });
  }),
);

router.put(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const b = categorySchema.partial().parse(req.body);
    const data: any = { ...b };
    if (b.slug !== undefined || b.name !== undefined) data.slug = slugify(b.slug || b.name || '');
    if (!data.slug) delete data.slug;
    const category = await prisma.category.update({ where: { id: Number(req.params.id) }, data });
    res.json({ category });
  }),
);

router.delete(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const count = await prisma.product.count({ where: { categoryId: id } });
    if (count > 0) throw new HttpError(409, `Move or delete its ${count} product(s) first, or just toggle it inactive.`);
    await prisma.category.delete({ where: { id } });
    res.json({ ok: true });
  }),
);

/* ───────── Products ───────── */
const variantSchema = z.object({
  id: z.number().int().optional(),
  sku: z.string().trim().optional().default(''),
  size: z.string().trim().default(''),
  color: z.string().trim().default(''),
  priceOverrideCents: z.number().int().min(0).nullable().optional(),
  stockQuantity: z.number().int().min(0).default(0),
});

const productSchema = z.object({
  name: z.string().trim().min(1, 'Name required'),
  slug: z.string().trim().optional(),
  description: z.string().default(''),
  basePriceCents: z.number().int().min(0),
  categoryId: z.number().int(),
  images: z.array(z.string()).default([]),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  defaultWeightOz: z.number().min(0).default(6),
  defaultLengthIn: z.number().min(0).default(10),
  defaultWidthIn: z.number().min(0).default(8),
  defaultHeightIn: z.number().min(0).default(1),
  variants: z.array(variantSchema).default([]),
});

const autoSku = (slug: string, v: { size: string; color: string }, i: number) =>
  [slug, v.size, v.color].filter(Boolean).join('-').toUpperCase().replace(/[^A-Z0-9-]+/g, '') || `${slug}-${i}`.toUpperCase();

function productData(b: z.infer<typeof productSchema>) {
  const { variants, images, slug, ...rest } = b;
  return { ...rest, slug: slugify(slug || b.name), imagesJson: JSON.stringify(images) };
}

router.get(
  '/products',
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      include: { category: true, variants: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ products: products.map(serializeProduct) });
  }),
);

router.get(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const p = await prisma.product.findUnique({
      where: { id: Number(req.params.id) },
      include: { category: true, variants: { orderBy: { id: 'asc' } } },
    });
    if (!p) throw new HttpError(404, 'Product not found');
    res.json({ product: serializeProduct(p) });
  }),
);

router.post(
  '/products',
  asyncHandler(async (req, res) => {
    const b = productSchema.parse(req.body);
    const data = productData(b);
    const p = await prisma.product.create({
      data: {
        ...data,
        variants: {
          create: b.variants.map((v, i) => ({
            sku: v.sku || autoSku(data.slug, v, i),
            size: v.size,
            color: v.color,
            priceOverrideCents: v.priceOverrideCents ?? null,
            stockQuantity: v.stockQuantity,
          })),
        },
      },
      include: { category: true, variants: true },
    });
    res.status(201).json({ product: serializeProduct(p) });
  }),
);

router.put(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const b = productSchema.parse(req.body);
    const data = productData(b);
    const existing = await prisma.productVariant.findMany({ where: { productId: id }, select: { id: true } });
    const keep = new Set(b.variants.filter((v) => v.id).map((v) => v.id!));

    await prisma.$transaction([
      prisma.product.update({ where: { id }, data }),
      prisma.productVariant.deleteMany({ where: { productId: id, id: { in: existing.map((e) => e.id).filter((x) => !keep.has(x)) } } }),
      ...b.variants.map((v, i) => {
        const vd = {
          sku: v.sku || autoSku(data.slug, v, i),
          size: v.size,
          color: v.color,
          priceOverrideCents: v.priceOverrideCents ?? null,
          stockQuantity: v.stockQuantity,
        };
        return v.id
          ? prisma.productVariant.update({ where: { id: v.id }, data: vd })
          : prisma.productVariant.create({ data: { ...vd, productId: id } });
      }),
    ]);
    const p = await prisma.product.findUnique({
      where: { id },
      include: { category: true, variants: { orderBy: { id: 'asc' } } },
    });
    res.json({ product: serializeProduct(p) });
  }),
);

router.delete(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const ordered = await prisma.orderItem.count({ where: { productId: id } });
    if (ordered > 0) {
      await prisma.product.update({ where: { id }, data: { isActive: false } });
      return res.json({ ok: true, archived: true });
    }
    await prisma.product.delete({ where: { id } });
    res.json({ ok: true, archived: false });
  }),
);

/* ───────── Videos ───────── */
const videoSchema = z.object({
  title: z.string().trim().min(1, 'Title required'),
  description: z.string().default(''),
  videoUrl: z.string().trim().min(1, 'Video URL required'),
  thumbnailUrl: z.string().trim().default(''),
  featuredName: z.string().trim().default(''),
  isPublished: z.boolean().default(true),
});

router.get(
  '/videos',
  asyncHandler(async (_req, res) => {
    res.json({ videos: await prisma.videoPost.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] }) });
  }),
);

router.post(
  '/videos',
  asyncHandler(async (req, res) => {
    const b = videoSchema.parse(req.body);
    const max = await prisma.videoPost.aggregate({ _max: { sortOrder: true } });
    const video = await prisma.videoPost.create({ data: { ...b, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
    res.status(201).json({ video });
  }),
);

router.put(
  '/videos/reorder',
  asyncHandler(async (req, res) => {
    const { ids } = z.object({ ids: z.array(z.number().int()) }).parse(req.body);
    await prisma.$transaction(ids.map((id, i) => prisma.videoPost.update({ where: { id }, data: { sortOrder: i } })));
    res.json({ ok: true });
  }),
);

router.put(
  '/videos/:id',
  asyncHandler(async (req, res) => {
    const b = videoSchema.partial().parse(req.body);
    res.json({ video: await prisma.videoPost.update({ where: { id: Number(req.params.id) }, data: b }) });
  }),
);

router.delete(
  '/videos/:id',
  asyncHandler(async (req, res) => {
    await prisma.videoPost.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  }),
);

export default router;

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

const ADULT = ['S', 'M', 'L', 'XL', '2XL'];
const YOUTH = ['YS', 'YM', 'YL'];

async function addProduct(opts: {
  name: string;
  slug: string;
  cat: string;
  price: number;
  desc: string;
  sizes: string[];
  color: string;
  stock?: number;
  featured?: boolean;
  weightOz?: number;
  dims?: [number, number, number];
}) {
  const category = await prisma.category.findUniqueOrThrow({ where: { slug: opts.cat } });
  const [l, w, h] = opts.dims ?? [10, 8, 1];
  await prisma.product.upsert({
    where: { slug: opts.slug },
    update: {},
    create: {
      name: opts.name,
      slug: opts.slug,
      description: opts.desc,
      basePriceCents: opts.price,
      categoryId: category.id,
      imagesJson: '[]',
      isFeatured: opts.featured ?? true,
      defaultWeightOz: opts.weightOz ?? 6,
      defaultLengthIn: l,
      defaultWidthIn: w,
      defaultHeightIn: h,
      variants: {
        create: opts.sizes.map((size) => ({
          sku: `${opts.slug}-${size}`.toUpperCase(),
          size,
          color: opts.color,
          stockQuantity: opts.stock ?? 10,
        })),
      },
    },
  });
}

async function main() {
  // Categories
  const cats = [
    ['T-Shirts', 't-shirts', 'Soft, comfortable tees built to wear from the practice room to the podium.'],
    ['Crewneck Sweatshirts', 'crewneck-sweatshirts', 'Warm-up layers for the cold gym and the long drive home.'],
    ['Singlets', 'singlets', 'Competition-ready singlets.'],
    ['Collabs', 'collabs', 'Limited collaborations with athletes, clubs and creators.'],
    ['Accessories', 'accessories', 'Caps, socks and more.'],
  ];
  for (const [i, [name, slug, description]] of cats.entries()) {
    await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug, description, sortOrder: i, isActive: true },
    });
  }

  // Products (modeled on the current live catalog)
  const tee = "Let's Wrassle tee. Soft, breathable, built to move with you through the final whistle.";
  for (const color of ['Blue', 'Gray', 'Green', 'Pink']) {
    await addProduct({ name: `Let's Wrassle T-Shirt - ${color}`, slug: `lets-wrassle-t-shirt-${color.toLowerCase()}`, cat: 't-shirts', price: 2500, desc: tee, sizes: ADULT, color });
  }
  await addProduct({ name: "Let's Wrassle T-Shirt - Founders Edition", slug: 'lets-wrassle-t-shirt-founders-edition', cat: 't-shirts', price: 2500, desc: tee, sizes: ADULT, color: 'Founders Edition' });
  await addProduct({ name: "Let's Wrassle T-Shirt - Halloween Orange", slug: 'lets-wrassle-t-shirt-halloween-orange', cat: 't-shirts', price: 2500, desc: 'Carve your way into the practice room with our Halloween inspired tee.', sizes: ADULT, color: 'Orange' });
  for (const color of ['White', 'Off White']) {
    await addProduct({ name: `YOUTH Let's Wrassle T-Shirt - ${color}`, slug: `youth-lets-wrassle-t-shirt-${color.toLowerCase().replace(' ', '-')}`, cat: 't-shirts', price: 2200, desc: `Youth-sized ${tee}`, sizes: YOUTH, color });
  }
  await addProduct({ name: "Let's Wrassle Crewneck - Gray", slug: 'lets-wrassle-crewneck-gray', cat: 'crewneck-sweatshirts', price: 3200, desc: 'Heavyweight, cozy crewneck sweatshirt.', sizes: ADULT, color: 'Gray', weightOz: 20, dims: [12, 10, 2] });
  await addProduct({ name: "Let's Wrassle Trucker Cap", slug: 'lets-wrassle-trucker-cap', cat: 'accessories', price: 1800, desc: 'Snapback trucker cap.', sizes: ['One Size'], color: 'Black', stock: 0, weightOz: 5, dims: [9, 8, 5] });
  await addProduct({ name: "Let's Wrassle Socks", slug: 'lets-wrassle-socks', cat: 'accessories', price: 1600, desc: 'Comfortable crew socks.', sizes: ['One Size'], color: 'White', weightOz: 4, dims: [9, 6, 1] });

  // Sample interviews (replace via Admin Hub → Videos)
  if ((await prisma.videoPost.count()) === 0) {
    await prisma.videoPost.createMany({
      data: [
        { title: 'Sample Interview: Finding Your Why', description: 'Placeholder entry — replace with your first athlete interview from the Admin Hub.', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', featuredName: 'Featured Athlete', sortOrder: 0 },
        { title: 'Sample Interview: Life After the Mat', description: 'Placeholder entry — edit or unpublish from the Admin Hub.', videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', featuredName: 'Guest Coach', sortOrder: 1 },
      ],
    });
  }

  // Default admin
  const email = (process.env.ADMIN_EMAIL || 'admin@letswrassleapparel.com').toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
    await prisma.user.create({
      data: { name: 'Store Admin', email, phone: null, passwordHash: await bcrypt.hash(password, 12), role: 'ADMIN' },
    });
    console.log(`\nAdmin created → ${email}`);
    if (!process.env.ADMIN_PASSWORD) console.log(`Generated password (save it now, it is not stored): ${password}`);
  } else {
    console.log(`Admin ${email} already exists (unchanged).`);
  }
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

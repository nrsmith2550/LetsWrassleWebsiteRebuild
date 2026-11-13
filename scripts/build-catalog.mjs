// Compiles content/*.json (edited via the CMS or by hand) into web/public/catalog.json.
// The storefront AND the payment functions both read that one file, so prices
// can never differ between what customers see and what they are charged.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const fail = (msg) => {
  console.error(`\nContent error: ${msg}\n`);
  process.exit(1);
};
const slugify = (s) => String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const cents = (dollars) => Math.round(Number(dollars) * 100);

const settingsRaw = read('content/settings.json');
const settings = {
  announcement: settingsRaw.announcement || '',
  shippingFlatCents: cents(settingsRaw.shippingFlat ?? 5.99),
  freeShippingOverCents: cents(settingsRaw.freeShippingOver ?? 0),
  taxRate: Number(settingsRaw.taxRatePercent ?? 6) / 100,
  pickupNotice: settingsRaw.pickupNotice || 'Please only select Local Pickup if coordinated beforehand.',
  itemWeightOz: Number(settingsRaw.itemWeightOz ?? 8),
  pkgLengthIn: Number(settingsRaw.pkgLengthIn ?? 10),
  pkgWidthIn: Number(settingsRaw.pkgWidthIn ?? 8),
  pkgHeightIn: Number(settingsRaw.pkgHeightIn ?? 2),
};

const categories = (read('content/categories.json').categories || []).map((c) => ({
  name: c.name,
  slug: c.slug || slugify(c.name),
  description: c.description || '',
}));
const catSlugs = new Set(categories.map((c) => c.slug));

const dir = path.join(root, 'content/products');
const products = [];
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  const slug = file.replace(/\.json$/, '');
  const p = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  if (!p.name) fail(`${file}: missing name`);
  if (!catSlugs.has(p.category)) fail(`${file}: category "${p.category}" is not in categories.json`);
  if (!(Number(p.price) >= 0)) fail(`${file}: price must be a number`);
  if (!Array.isArray(p.variants) || !p.variants.length) fail(`${file}: add at least one variant (size/color)`);

  const seen = new Set();
  const variants = p.variants.map((v) => {
    const id = slugify(`${slug}-${v.size || 'os'}-${v.color || 'std'}`);
    if (seen.has(id)) fail(`${file}: duplicate variant ${v.size}/${v.color}`);
    seen.add(id);
    const priceCents = cents(v.price ?? p.price);
    return { id, size: v.size || '', color: v.color || '', priceCents, inStock: v.inStock !== false };
  });

  products.push({
    slug,
    name: p.name,
    category: p.category,
    description: p.description || '',
    images: p.images || [],
    featured: !!p.featured,
    active: p.active !== false,
    isNew: !!p.isNew,
    date: p.date || '2025-01-01T00:00:00.000Z',
    priceCents: cents(p.price),
    minPriceCents: Math.min(...variants.map((v) => v.priceCents)),
    ...(p.weightOz ? { weightOz: Number(p.weightOz) } : {}),
    variants,
  });
}

const videos = (read('content/videos.json').videos || []).map((v, i) => ({
  id: i + 1,
  title: v.title,
  description: v.description || '',
  url: v.url,
  thumbnail: v.thumbnail || '',
  featuredName: v.featuredName || '',
  published: v.published !== false,
}));

const out = path.join(root, 'web/public/catalog.json');
fs.writeFileSync(out, JSON.stringify({ settings, categories, products, videos }));
console.log(`catalog.json: ${products.length} products, ${categories.length} categories, ${videos.length} videos`);

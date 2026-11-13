import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LockIcon, ReturnIcon, TruckIcon } from '../components/Icons';
import ProductCard from '../components/ProductCard';
import ProductImage from '../components/ProductImage';
import { Script } from '../components/Title';
import { money } from '../lib/api';
import { useCart } from '../lib/cart';
import { useCatalog } from '../lib/catalog';

/** Splits the product text into the story, short "Material: ..." facts and the size chart rows (display only). */
function parseDescription(text: string) {
  const [body, chart = ''] = text.split(/\n\s*Size chart\s*\n/i);
  const paragraphs: string[] = [];
  const facts: [string, string][] = [];
  for (const line of body.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const m = line.match(/^([A-Za-z][A-Za-z ]{1,18}):\s+(.{1,60})$/);
    if (m) facts.push([m[1], m[2]]);
    else paragraphs.push(line);
  }
  const rows = chart.split('\n').map((l) => l.trim()).filter((l) => l.includes('|')).map((l) => {
    const at = l.indexOf(':');
    return { label: at > 0 ? l.slice(0, at).trim() : '', cells: (at > 0 ? l.slice(at + 1) : l).split('|').map((c) => c.trim()) };
  });
  return { paragraphs, facts, rows };
}

const pill = (on: boolean, extra = '') =>
  `rounded-sm border px-4 py-3 text-sm font-semibold transition ${on ? 'border-black bg-black text-white' : 'border-gray-300 bg-white hover:border-black'} ${extra}`;

export default function ProductPage() {
  const { slug } = useParams();
  const { add } = useCart();
  const { catalog, error } = useCatalog();
  const p = catalog?.products.find((x) => x.slug === slug && x.active);
  const category = catalog?.categories.find((c) => c.slug === p?.category);

  const [img, setImg] = useState(0);
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!p) return;
    setImg(0);
    setQty(1);
    const first = p.variants.find((v) => v.inStock) || p.variants[0];
    setColor(first?.color || '');
    setSize(first?.size || '');
  }, [p?.slug]);

  const colors = useMemo(() => [...new Set((p?.variants || []).map((v) => v.color).filter(Boolean))], [p]);
  const sizes = useMemo(() => [...new Set((p?.variants || []).filter((v) => !color || v.color === color).map((v) => v.size).filter(Boolean))], [p, color]);
  const variant = p?.variants.find((v) => v.color === color && v.size === size);
  const desc = useMemo(() => parseDescription(p?.description || ''), [p]);

  if (error) return <div className="px-5 py-24 text-center"><p className="text-red-700">{error}</p><p className="mt-2 text-sm text-gray-600">Please refresh the page to try again.</p></div>;
  if (!catalog) {
    return (
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 md:grid-cols-2" aria-busy="true" aria-label="Loading product">
        <div className="skeleton aspect-square rounded-lg" />
        <div className="space-y-4 pt-4"><div className="skeleton h-4 w-24" /><div className="skeleton h-10 w-3/4" /><div className="skeleton h-7 w-24" /><div className="skeleton h-12 w-full" /><div className="skeleton h-12 w-full" /></div>
      </div>
    );
  }
  if (!p) return <div className="px-5 py-24 text-center"><h1 className="text-3xl">Product not found</h1><p className="mt-2 text-gray-600">It may have sold out or been moved.</p><Link to="/shop" className="btn-primary mt-6">Back to shop</Link></div>;

  const inStock = !!variant?.inStock;
  const related = catalog.products.filter((x) => x.active && x.slug !== p.slug && x.category === p.category).slice(0, 3);

  return (
    <>
    <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-10">
      <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm text-gray-600" aria-label="Breadcrumb">
        <Link to="/shop" className="hover:text-ink hover:underline">Store</Link>
        {category && <><span aria-hidden>/</span><Link to={`/shop/${category.slug}`} className="hover:text-ink hover:underline">{category.name}</Link></>}
      </nav>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
        <div className="min-w-0 md:sticky md:top-36 md:self-start">
          <div className="aspect-square overflow-hidden rounded-sm bg-mist"><ProductImage src={p.images[img]} alt={p.name} label={color} /></div>
          {p.images.length > 1 && (
            <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-2">
              {p.images.map((u, i) => (
                <button key={u + i} onClick={() => setImg(i)} aria-label={`Show photo ${i + 1}`} aria-current={i === img}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-sm border-2 bg-white transition sm:h-20 sm:w-20 ${i === img ? 'border-black' : 'border-transparent opacity-80 hover:opacity-100'}`}><ProductImage src={u} alt="" /></button>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h1 className="text-4xl md:text-5xl">{p.name}</h1>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-2xl font-bold">{money(variant?.priceCents ?? p.minPriceCents)}</span>
            {p.isNew && <span className="badge bg-flag text-white">New</span>}
          </div>

          {colors.length > 0 && (
            <div className="mt-7">
              <div className="mb-2 text-sm text-gray-600">Color: <span className="font-semibold text-ink">{color}</span></div>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button key={c} aria-pressed={c === color} onClick={() => { setColor(c); const f = p.variants.find((v) => v.color === c && v.inStock) || p.variants.find((v) => v.color === c); setSize(f?.size || ''); }}
                    className={pill(c === color)}>{c}</button>
                ))}
              </div>
            </div>
          )}
          {sizes.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
                <span>Size: <span className="font-semibold text-ink">{size}</span></span>
                {desc.rows.length > 0 && <a href="#size-chart" className="underline hover:text-black">Size chart</a>}
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const v = p.variants.find((x) => x.color === color && x.size === s);
                  return (
                    <button key={s} onClick={() => setSize(s)} aria-pressed={s === size} title={!v?.inStock ? 'Out of stock' : undefined}
                      className={pill(s === size, `min-w-[3.25rem] ${!v?.inStock ? (s === size ? 'line-through opacity-70' : 'text-gray-400 line-through') : ''}`)}>{s}</button>
                  );
                })}
              </div>
            </div>
          )}

          <div className={`mt-5 flex items-center gap-2 text-sm font-medium ${!variant ? 'text-gray-600' : inStock ? 'text-green-700' : 'text-red-700'}`}>
            {variant && <span className={`h-2 w-2 rounded-full ${inStock ? 'bg-green-600' : 'bg-red-600'}`} />}
            {!variant ? 'Select options' : inStock ? 'In stock, ships in 2–3 business days' : 'Out of stock'}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex items-center rounded-sm border border-gray-300 bg-white">
              <button className="px-4 py-3.5" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
              <span className="w-6 text-center font-medium" aria-live="polite">{qty}</span>
              <button className="px-4 py-3.5" onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Increase">+</button>
            </div>
            <button className="btn-primary flex-1" disabled={!variant || !inStock}
              onClick={() => variant && add({ variantId: variant.id, slug: p.slug, name: p.name, variantLabel: [variant.size && `Size ${variant.size}`, variant.color].filter(Boolean).join(' / '), image: p.images[0], unitPriceCents: variant.priceCents }, qty)}>
              {variant && !inStock ? 'Sold out' : 'Add to cart'}
            </button>
          </div>

          <ul className="mt-6 grid gap-3 border-y border-gray-200 py-4 text-sm text-gray-700 sm:grid-cols-3">
            <li className="flex items-center gap-2"><TruckIcon />Ships in 2–3 days</li>
            <li className="flex items-center gap-2"><ReturnIcon />7-day returns</li>
            <li className="flex items-center gap-2"><LockIcon />Secure checkout</li>
          </ul>

          {desc.paragraphs.length > 0 && (
            <div className="prose-store mt-8 text-[16px] leading-relaxed text-gray-800">
              <h2 className="mb-3 text-xl">Description</h2>
              {desc.paragraphs.map((t, i) => <p key={i}>{t}</p>)}
            </div>
          )}
          {desc.facts.length > 0 && (
            <dl className="mt-6 divide-y divide-gray-200 border-y border-gray-200 text-sm">
              {desc.facts.map(([k, v]) => <div key={k} className="flex justify-between gap-6 py-2.5"><dt className="text-gray-600">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}
            </dl>
          )}
          {desc.rows.length > 0 && (
            <div id="size-chart" className="mt-8 scroll-mt-40">
              <h2 className="mb-3 text-xl">Size chart</h2>
              <div className="overflow-x-auto rounded-sm border border-gray-200 bg-white">
                <table className="w-full whitespace-nowrap text-sm">
                  <tbody>
                    {desc.rows.map((r, i) => (
                      <tr key={i} className={i === 0 ? 'bg-fog font-semibold' : 'border-t border-gray-200'}>
                        <th scope="row" className="px-3 py-2.5 text-left font-semibold">{r.label}</th>
                        {r.cells.map((c, k) => <td key={k} className="px-3 py-2.5 text-center">{c}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
      {related.length > 0 && (
        <section className="mt-10 bg-black text-white md:mt-16">
          <div className="section">
            <h2 className="section-title mb-10 md:mb-14"><Script>You may</Script>Also Like</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-8 md:gap-y-14">{related.map((x) => <ProductCard key={x.slug} p={x} />)}</div>
          </div>
        </section>
      )}
    </>
  );
}

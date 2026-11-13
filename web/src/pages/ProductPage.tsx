import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import { money } from '../lib/api';
import { useCart } from '../lib/cart';
import { useCatalog } from '../lib/catalog';

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

  if (error) return <p className="p-20 text-center text-red-600">{error}</p>;
  if (!catalog) return <div className="p-20 text-center text-gray-500">Loading…</div>;
  if (!p) return <div className="p-20 text-center"><h1 className="text-3xl">Not found</h1><Link to="/shop" className="btn-primary mt-4">Back to shop</Link></div>;

  const inStock = !!variant?.inStock;

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2">
      <div>
        <div className="aspect-square overflow-hidden rounded bg-bone"><ProductImage src={p.images[img]} alt={p.name} label={color} /></div>
        {p.images.length > 1 && (
          <div className="mt-3 grid grid-cols-5 gap-2">
            {p.images.map((u, i) => (
              <button key={u + i} onClick={() => setImg(i)} className={`aspect-square overflow-hidden rounded border-2 ${i === img ? 'border-orange' : 'border-transparent'}`}><ProductImage src={u} alt={`${p.name} ${i + 1}`} /></button>
            ))}
          </div>
        )}
      </div>

      <div>
        {category && <Link to={`/shop/${category.slug}`} className="text-xs font-bold uppercase tracking-widest text-orange">{category.name}</Link>}
        <h1 className="mt-1 text-3xl md:text-4xl">{p.name}</h1>
        <div className="mt-3 text-2xl font-bold">{money(variant?.priceCents ?? p.minPriceCents)}</div>

        {colors.length > 0 && (
          <div className="mt-6">
            <div className="label">Color: <span className="text-ink">{color}</span></div>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button key={c} onClick={() => { setColor(c); const f = p.variants.find((v) => v.color === c && v.inStock) || p.variants.find((v) => v.color === c); setSize(f?.size || ''); }}
                  className={`rounded border-2 px-4 py-2 text-sm font-semibold ${c === color ? 'border-ink bg-ink text-white' : 'border-gray-300 hover:border-ink'}`}>{c}</button>
              ))}
            </div>
          </div>
        )}
        {sizes.length > 0 && (
          <div className="mt-5">
            <div className="label">Size: <span className="text-ink">{size}</span></div>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => {
                const v = p.variants.find((x) => x.color === color && x.size === s);
                return (
                  <button key={s} onClick={() => setSize(s)}
                    className={`min-w-12 rounded border-2 px-3 py-2 text-sm font-semibold ${s === size ? 'border-ink bg-ink text-white' : 'border-gray-300 hover:border-ink'} ${!v?.inStock ? 'text-gray-400 line-through' : ''}`}>{s}</button>
                );
              })}
            </div>
          </div>
        )}

        <div className={`mt-4 text-sm font-bold ${!variant ? 'text-gray-500' : inStock ? 'text-green-700' : 'text-red-600'}`}>{!variant ? 'Select options' : inStock ? 'In stock' : 'Out of stock'}</div>

        <div className="mt-5 flex items-center gap-3">
          <div className="flex items-center rounded border">
            <button className="px-3 py-3" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
            <span className="w-8 text-center">{qty}</span>
            <button className="px-3 py-3" onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Increase">+</button>
          </div>
          <button className="btn-orange flex-1" disabled={!variant || !inStock}
            onClick={() => variant && add({ variantId: variant.id, slug: p.slug, name: p.name, variantLabel: [variant.size && `Size ${variant.size}`, variant.color].filter(Boolean).join(' / '), image: p.images[0], unitPriceCents: variant.priceCents }, qty)}>
            {variant && !inStock ? 'Sold out' : 'Add to cart'}
          </button>
        </div>

        {p.description && <p className="mt-8 whitespace-pre-line text-gray-700">{p.description}</p>}
        <p className="mt-6 rounded bg-bone p-3 text-xs text-gray-600">Ships in 2–3 business days. Returns within 7 days of delivery for unworn, unwashed items.</p>
      </div>
    </div>
  );
}

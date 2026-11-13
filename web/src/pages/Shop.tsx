import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard';
import { Script } from '../components/Title';
import { useCatalog } from '../lib/catalog';

const SORTS = [
  ['featured', 'Featured'],
  ['newest', 'Newest'],
  ['price-asc', 'Price: Low to High'],
  ['price-desc', 'Price: High to Low'],
];

export default function Shop() {
  const { categorySlug } = useParams();
  const { catalog, error } = useCatalog();
  const [sort, setSort] = useState('featured');

  const products = useMemo(() => {
    const list = (catalog?.products ?? []).filter((p) => p.active && (!categorySlug || p.category === categorySlug));
    const by: Record<string, (a: any, b: any) => number> = {
      featured: (a, b) => Number(b.featured) - Number(a.featured),
      newest: (a, b) => +new Date(b.date) - +new Date(a.date),
      'price-asc': (a, b) => a.minPriceCents - b.minPriceCents,
      'price-desc': (a, b) => b.minPriceCents - a.minPriceCents,
    };
    return [...list].sort(by[sort]);
  }, [catalog, categorySlug, sort]);

  const tab = (active: boolean) =>
    `whitespace-nowrap rounded-sm border px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] transition ${active ? 'border-white bg-white text-black' : 'border-white/30 text-white/80 hover:border-white hover:text-white'}`;

  const category = catalog?.categories.find((c) => c.slug === categorySlug);

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-16">
      <div>
        <h1 className="text-5xl md:text-7xl">{category ? category.name : <><Script>Shop</Script>All</>}</h1>
        <p className="mt-4 max-w-xl text-lg text-white/70">{category?.description || "Every Let's Wrassle release in one place."}</p>
      </div>
      <div className="mb-10 mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          <Link to="/shop" className={tab(!categorySlug)}>All</Link>
          {catalog?.categories
            .filter((c) => catalog.products.some((p) => p.active && p.category === c.slug))
            .map((c) => <Link key={c.slug} to={`/shop/${c.slug}`} className={tab(categorySlug === c.slug)}>{c.name}</Link>)}
        </div>
        <div className="flex items-center gap-3">
          {catalog && <span className="whitespace-nowrap text-sm text-white/60">{products.length} {products.length === 1 ? 'product' : 'products'}</span>}
          <select className="input !py-2.5 md:w-56" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      {error ? (
        <div className="py-20 text-center"><p className="text-red-400">{error}</p><p className="mt-2 text-sm text-white/60">Please refresh the page to try again.</p></div>
      ) : !catalog ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-8 md:gap-y-14">{Array.from({ length: 6 }, (_, k) => <ProductCardSkeleton key={k} />)}</div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center"><p className="text-white/60">No products here yet.</p><Link to="/shop" className="btn-light mt-5">View all products</Link></div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-8 md:gap-y-14">{products.map((p) => <ProductCard key={p.slug} p={p} />)}</div>
      )}
    </div>
  );
}

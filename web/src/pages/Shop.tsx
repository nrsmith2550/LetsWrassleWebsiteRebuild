import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard';
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
    `whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition ${active ? 'border-ink bg-ink text-white' : 'border-gray-300 bg-white text-ink hover:border-ink'}`;

  const category = catalog?.categories.find((c) => c.slug === categorySlug);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl">{category?.name || 'Shop All'}</h1>
        <p className="mx-auto mt-3 max-w-xl text-gray-600">{category?.description || "Every Let's Wrassle release in one place."}</p>
      </div>
      <div className="mb-8 mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          <Link to="/shop" className={tab(!categorySlug)}>All</Link>
          {catalog?.categories
            .filter((c) => catalog.products.some((p) => p.active && p.category === c.slug))
            .map((c) => <Link key={c.slug} to={`/shop/${c.slug}`} className={tab(categorySlug === c.slug)}>{c.name}</Link>)}
        </div>
        <div className="flex items-center gap-3">
          {catalog && <span className="whitespace-nowrap text-sm text-gray-600">{products.length} {products.length === 1 ? 'product' : 'products'}</span>}
          <select className="input !rounded-full !py-2 md:w-56" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      {error ? (
        <div className="py-20 text-center"><p className="text-red-700">{error}</p><p className="mt-2 text-sm text-gray-600">Please refresh the page to try again.</p></div>
      ) : !catalog ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, k) => <ProductCardSkeleton key={k} />)}</div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center"><p className="text-gray-600">No products here yet.</p><Link to="/shop" className="btn-primary mt-5">View all products</Link></div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">{products.map((p) => <ProductCard key={p.slug} p={p} />)}</div>
      )}
    </div>
  );
}

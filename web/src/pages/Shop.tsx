import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
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
    `whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold uppercase tracking-wider transition ${active ? 'bg-ink text-white' : 'bg-bone text-ink hover:bg-orange hover:text-white'}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-4xl">{catalog?.categories.find((c) => c.slug === categorySlug)?.name || 'Shop All'}</h1>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Link to="/shop" className={tab(!categorySlug)}>All</Link>
          {catalog?.categories
            .filter((c) => catalog.products.some((p) => p.active && p.category === c.slug))
            .map((c) => <Link key={c.slug} to={`/shop/${c.slug}`} className={tab(categorySlug === c.slug)}>{c.name}</Link>)}
        </div>
        <select className="input md:w-56" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {error ? <p className="py-20 text-center text-red-600">{error}</p> : !catalog ? <p className="py-20 text-center text-gray-500">Loading…</p> : products.length === 0 ? (
        <p className="py-20 text-center text-gray-500">No products here yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">{products.map((p) => <ProductCard key={p.slug} p={p} />)}</div>
      )}
    </div>
  );
}
